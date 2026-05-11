use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Serialize};

use crate::error::{AppError, Result};

/// Issue a GET and deserialise JSON, turning non-2xx responses into `AppError::Server`.
pub async fn get<T: DeserializeOwned>(client: &Client, url: &str, token: Option<&str>) -> Result<T> {
    let mut req = client.get(url);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    let resp = req.send().await?;
    check(resp).await?.json::<T>().await.map_err(Into::into)
}

/// Issue a POST with a JSON body.
pub async fn post<B: Serialize, T: DeserializeOwned>(
    client: &Client,
    url: &str,
    token: Option<&str>,
    body: &B,
) -> Result<T> {
    let mut req = client.post(url).json(body);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    let resp = req.send().await?;
    check(resp).await?.json::<T>().await.map_err(Into::into)
}

/// Issue a PUT with a JSON body.
pub async fn put<B: Serialize, T: DeserializeOwned>(
    client: &Client,
    url: &str,
    token: &str,
    body: &B,
) -> Result<T> {
    let resp = client.put(url).bearer_auth(token).json(body).send().await?;
    check(resp).await?.json::<T>().await.map_err(Into::into)
}

/// Issue a DELETE, discarding any response body.
pub async fn delete(client: &Client, url: &str, token: &str) -> Result<()> {
    let resp = client.delete(url).bearer_auth(token).send().await?;
    check(resp).await?;
    Ok(())
}

/// Issue a POST with a JSON body, discarding any response body (expects 2xx).
pub async fn post_void<B: Serialize>(
    client: &Client,
    url: &str,
    token: Option<&str>,
    body: &B,
) -> Result<()> {
    let mut req = client.post(url).json(body);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    let resp = req.send().await?;
    check(resp).await?;
    Ok(())
}

/// Issue a POST with no body (keepalive).
pub async fn post_empty(client: &Client, url: &str, token: &str) -> Result<()> {
    let resp = client
        .post(url)
        .bearer_auth(token)
        .header("content-length", "0")
        .send()
        .await?;
    check(resp).await?;
    Ok(())
}

async fn check(resp: reqwest::Response) -> Result<reqwest::Response> {
    if resp.status().is_success() {
        return Ok(resp);
    }
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    if status == StatusCode::UNAUTHORIZED.as_u16() {
        return Err(AppError::NoSession);
    }
    Err(AppError::Server { status, body })
}
