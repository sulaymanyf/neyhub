document.addEventListener('DOMContentLoaded', function() {
         const VF = Vex.Flow;

		const div = document.getElementById("vf");
		const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
		renderer.resize(500, 200);
		const context = renderer.getContext();
		const stave = new VF.Stave(10, 40, 400).addClef("treble").addTimeSignature("4/4");
		stave.setContext(context).draw();

		const notes = [
			new VF.StaveNote({
				keys: ["D/5"],
				duration: "h",
			}).addDotToAll(),

			new VF.StaveNote({
				keys: ["b/4"],
				duration: "qr",
			}),
		];

		const voice = new VF.Voice({num_beats: 4, beat_value: 4}).addTickables(notes);
		new VF.Formatter().joinVoices([voice]).format([voice], 400);
		voice.draw(context, stave);

        });