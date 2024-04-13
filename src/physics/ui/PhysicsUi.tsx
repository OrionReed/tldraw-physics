import { track, useEditor } from "@tldraw/tldraw";
import { useEffect, useState } from "react";
import "../../css/physics-ui.css";
import { useCollection } from "../../../tldraw-collections/src";

export const PhysicsUi = track(() => {
	const editor = useEditor();
	const physicsCollection = useCollection('physics')

	const [size, setSize] = useState(0)

	const updateSize = () => {
		setSize(physicsCollection.getShapes().size)
	}

	const handleAdd = () => {
		if (physicsCollection) {
			physicsCollection.add(editor.getSelectedShapes())
			editor.selectNone()
			updateSize()
		}
	}

	const handleRemove = () => {
		if (physicsCollection) {
			physicsCollection.remove(editor.getSelectedShapes())
			editor.selectNone()
			updateSize()
		}
	}

	const handleShortcut = () => {
		if (!physicsCollection) return
		const empty = physicsCollection.getShapes().size === 0
		if (empty)
			physicsCollection.add(editor.getCurrentPageShapes())
		else
			physicsCollection.clear()
		updateSize()
	};

	const handleHighlight = () => {
		if (physicsCollection) {
			editor.setHintingShapes([...physicsCollection.getShapes().values()])
			updateSize()
		}
	}

	useEffect(() => {
		window.addEventListener('togglePhysicsEvent', handleShortcut);
		return () => {
			window.removeEventListener('togglePhysicsEvent', handleShortcut);
		};
	}, [handleShortcut]);

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<div>{size} shapes</div>
				<button
					type="button"
					title="Add Selected"
					className="custom-button"
					onClick={handleAdd}
				>
					Add
				</button>
				<button
					type="button"
					title="Remove Selected"
					className="custom-button"
					onClick={handleRemove}
				>
					Remove
				</button>
				<button
					type="button"
					title="Highlight Collection"
					className="custom-button"
					onClick={handleHighlight}
				>
					🔦
				</button>
			</div>
		</div>
	);
});
