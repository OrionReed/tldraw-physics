import { track, useEditor } from "@tldraw/tldraw";
import { useEffect, useState } from "react";
import "../../css/physics-ui.css";
import { useCollection } from "../../../tldraw-collections/src";

export const SimControls = track(() => {
	const editor = useEditor();
	const [physicsEnabled, setPhysics] = useState(false);
	const physicsCollection = useCollection('physics')

	useEffect(() => {
		const togglePhysics = () => {
			setPhysics(prev => !prev);
		};

		window.addEventListener('togglePhysicsEvent', togglePhysics);

		return () => {
			window.removeEventListener('togglePhysicsEvent', togglePhysics);
		};
	}, []);

	// const { addShapes } = usePhysicsSimulation(editor, physicsEnabled);

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
					onClick={() => physicsCollection.add(editor.getSelectedShapes())}
				>
					+
				</button>
			</div>
		</div>
	);
});
