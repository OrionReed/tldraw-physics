import { track, useEditor } from "@tldraw/tldraw";
import { useEffect, useState } from "react";
import { usePhysicsSimulation } from "./physics/simulation";
import "./css/dev-ui.css";

export const PhysicsUI = track(() => {
	const editor = useEditor();
	const [physicsEnabled, setPhysics] = useState(false);

	useEffect(() => {
		const togglePhysics = () => {
			setPhysics(prev => !prev);
		};

		window.addEventListener('togglePhysicsEvent', togglePhysics);

		return () => {
			window.removeEventListener('togglePhysicsEvent', togglePhysics);
		};
	}, []);

	const { addShapes } = usePhysicsSimulation(editor, physicsEnabled);

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<button
					type="button"
					className="custom-button"
					data-isactive={physicsEnabled}
					title="Toggle physics (P)"
					onClick={() => setPhysics(!physicsEnabled)}
				>
					Physics
				</button>
				<button
					type="button"
					className="custom-button"
					title="Add to physics simulation"
					onClick={() => addShapes(editor.selectedShapes)}
				>
					+
				</button>
			</div>
		</div>
	);
});
