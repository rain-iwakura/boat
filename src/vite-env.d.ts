/// <reference types="vite/client" />
/// <reference types="@atcute/bluesky" />

interface ImportMetaEnv {
	VITE_PLC_DIRECTORY_URL: string;
	VITE_APPVIEW_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
