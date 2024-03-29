import { Tldraw, track, useEditor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { SimControls } from "./physics/ui/PhysicsControls";
import { useYjsStore } from "./useYjsStore";
import { uiOverrides } from "./physics/ui/overrides";

const store = () => {
	const hostUrl = import.meta.env.DEV
		? "ws://localhost:1234"
		: import.meta.env.VITE_PRODUCTION_URL.replace("https://", "ws://"); // remove protocol just in case
	const roomId =
		new URLSearchParams(window.location.search).get("room") || "42";
	return useYjsStore({
		roomId: roomId,
		hostUrl: hostUrl,
	});
}

export default function Canvas() {

	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				// store={store()}
				shareZone={<NameEditor />}
				overrides={uiOverrides}
			>
				<SimControls />
			</Tldraw>
		</div>
	);
}

const NameEditor = track(() => {
	const editor = useEditor();

	const { color, name } = editor.user.getUserPreferences();

	return (
		<div
			style={{
				// TODO: style this properly and consistently with tldraw
				pointerEvents: "all",
				display: "flex",
				width: "148px",
				margin: "4px 8px",
				border: "none",
			}}
		>
			<input
				style={{
					borderRadius: "9px 0px 0px 9px",
					border: "none",
					backgroundColor: "white",
					boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
				}}
				type="color"
				value={color}
				onChange={(e) => {
					editor.user.updateUserPreferences({
						color: e.currentTarget.value,
					});
				}}
			/>
			<input
				style={{
					width: "100%",
					borderRadius: "0px 9px 9px 0px",
					border: "none",
					backgroundColor: "white",
					boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
				}}
				value={name}
				onChange={(e) => {
					editor.user.updateUserPreferences({
						name: e.currentTarget.value,
					});
				}}
			/>
		</div>
	);
});
