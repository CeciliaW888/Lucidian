import { requestUrl, RequestUrlParam } from "obsidian";

const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";

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

async function post(url: string, body: Record<string, string>, headers?: Record<string, string>): Promise<string> {
	const params: RequestUrlParam = {
		url,
		method: "POST",
		headers: { Accept: "application/json", ...headers },
		body: new URLSearchParams(body).toString(),
		contentType: "application/x-www-form-urlencoded",
	};
	const resp = await requestUrl(params);
	return resp.text;
}

async function get(url: string, headers: Record<string, string>): Promise<string> {
	const resp = await requestUrl({ url, method: "GET", headers: { Accept: "application/json", ...headers } });
	return resp.text;
}

export async function fetchDeviceCode(): Promise<DeviceCodeResponse> {
	const text = await post(GITHUB_DEVICE_CODE_URL, {
		client_id: GITHUB_CLIENT_ID,
		scope: "read:user",
	});
	return JSON.parse(text);
}

export async function pollForAccessToken(deviceCode: string, interval: number, expiresIn: number): Promise<string> {
	const deadline = Date.now() + expiresIn * 1000;
	while (Date.now() < deadline) {
		await sleep(interval * 1000);
		const text = await post(GITHUB_ACCESS_TOKEN_URL, {
			client_id: GITHUB_CLIENT_ID,
			device_code: deviceCode,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		});
		const data = JSON.parse(text);
		if (data.access_token) return data.access_token;
		if (data.error === "expired_token") throw new Error("Device code expired");
		if (data.error && data.error !== "authorization_pending" && data.error !== "slow_down") {
			throw new Error(`Auth error: ${data.error}`);
		}
	}
	throw new Error("Polling timed out");
}

export async function fetchCopilotToken(pat: string): Promise<CopilotToken> {
	const text = await get(COPILOT_TOKEN_URL, { Authorization: `token ${pat}` });
	const data = JSON.parse(text);
	if (!data.token) throw new Error("Failed to get Copilot token");
	return {
		token: data.token,
		expiresAt: data.expires_at ?? (Date.now() / 1000 + 1800),
	};
}

export function isTokenExpired(expiresAt: number, bufferSeconds = 300): boolean {
	return Date.now() / 1000 >= expiresAt - bufferSeconds;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
