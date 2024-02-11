import { track, useEditor } from "@tldraw/tldraw";
import { useState } from "react";
import "./css/dev-ui.css";
import { usePhysicsSimulation } from "./physics/simulation";

export const PhysicsUI = track(() => {
	const editor = useEditor();
	const [physicsEnabled, setPhysics] = useState(false);

	usePhysicsSimulation(editor, physicsEnabled);

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
			</div>
		</div>
	);
});
