import { track, useEditor } from "@tldraw/tldraw";
import { useState } from "react";
import "./css/dev-ui.css";
import { physicsSim } from "./physics/world";

export const PhysicsUI = track(() => {
	const editor = useEditor();
	const [physicsEnabled, setPhysics] = useState(false);

	physicsSim(editor, physicsEnabled);

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<button
					type="button"
					className="custom-button"
					data-isactive={physicsEnabled}
					onClick={() => setPhysics(!physicsEnabled)}
				>
					Physics
				</button>
				{/* <button type="button" className="custom-button" onClick={() => physicsSim.addShapes(editor.selectedShapes)}>
					+
				</button> */}
			</div>
		</div>
	);
});
