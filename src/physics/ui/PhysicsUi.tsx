import { track, useEditor } from "@tldraw/tldraw";
import { useEffect } from "react";
import "../../css/physics-ui.css";
import { useCollection } from "../../../tldraw-collections/src";

export const PhysicsUi = track(() => {
	const editor = useEditor();
	const { collection, size } = useCollection('physics')

	const handleAdd = () => {
		if (collection) {
			collection.add(editor.getSelectedShapes())
			editor.selectNone()
		}
	}

	const handleRemove = () => {
		if (collection) {
			collection.remove(editor.getSelectedShapes())
			editor.selectNone()
		}
	}

	const handleShortcut = () => {
		if (!collection) return
		if (size === 0)
			collection.add(editor.getCurrentPageShapes())
		else
			collection.clear()
	};

	const handleHelp = () => {
		alert("Use the 'Add' and 'Remove' buttons to add/remove selected shapes, or hit 'P' to add/remove all shapes. \n\nUse the highlight button (🔦) to visualize shapes in the simulation. \n\nShapes' physical properties vary by color (Orange is bouncy, Blue is slippery, Violet is a keyboard-controlled character, etc). \n\nYou can group shapes for compound rigidbodies. \n\nFor more details, check the project's README.");
	}

	const handleHighlight = () => {
		if (collection) {
			editor.setHintingShapes([...collection.getShapes().values()])
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
				<div>

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
					<button
						type="button"
						title="Show Help"
						className="custom-button"
						onClick={handleHelp}
					>
						⁉️
					</button>
				</div>
				<span>{size} shapes</span>
			</div>
		</div>
	);
});
