/**
 * GitHub Copilot OAuth device code flow and token management.
 *
 * Flow: GitHub OAuth → PAT → Copilot API token (short-lived, auto-refreshed).
 */

import { requestUrl } from 'obsidian';

const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface CopilotToken {
  token: string;
  expiresAt: number;
}

export async function fetchDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await requestUrl({
    url: GITHUB_DEVICE_CODE_URL,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user',
    }),
  });

  return response.json;
}

export async function pollForAccessToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string> {
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    const response = await requestUrl({
      url: GITHUB_ACCESS_TOKEN_URL,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = response.json;

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === 'slow_down') {
      pollInterval += 5000;
      continue;
    }

    if (data.error === 'authorization_pending') {
      continue;
    }

    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }

    if (data.error) {
      throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }
  }

  throw new Error('Device code flow timed out.');
}

export async function fetchCopilotToken(pat: string): Promise<CopilotToken> {
  const response = await requestUrl({
    url: COPILOT_TOKEN_URL,
    method: 'GET',
    headers: {
      'Authorization': `token ${pat}`,
      'Accept': 'application/json',
    },
  });

  const data = response.json;
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export function isTokenExpired(expiresAt: number, bufferSeconds = 300): boolean {
  return Date.now() / 1000 >= expiresAt - bufferSeconds;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
