var volumeHover = false;
var elements = {
	userInput: $("#usernameInput"),
	userSubmit: $("#setUsername"),
	createRoomInput: $("#createRoomInput"),
	createRoom: $("#createRoom"),
	video: {
		panel: $("#videoPanel"),
		bar: $("#videoBar"),
		timer: $("#videoTime"),
		timerChanger: $("#changeVideoPosition"),
		volume: $("#volumeBtn"),
		volumeSlider: $("#volumeSlider"),
	}
}

elements.userInput.on( "keydown", function(ev) {
	var keycode = (ev.keyCode ? ev.keyCode : ev.which);
	if (keycode == '13' && elements.userInput.val() != "") { //enter
		elements.userSubmit.click();
	}
})

elements.createRoomInput.on( "keydown", function(ev) {
	var keycode = (ev.keyCode ? ev.keyCode : ev.which);
	if (keycode == '13' && elements.createRoomInput.val() != "") { //enter
		elements.createRoom.click();
	}
})

elements.video.timer.on( "keydown", function(ev) {
	var keycode = (ev.keyCode ? ev.keyCode : ev.which);
	if (keycode == '13' && elements.video.timer.val() != "") { //enter
		elements.video.timerChanger.click();
	}
})

elements.video.volume.click(function(){
	elements.video.volumeSlider.toggle();
	var volume = elements.video.volumeSlider.prop('volume')
	if(volume > 0.5)
		elements.video.volume.removeClass('glyphicon glyphicon-volume-off').removeClass('glyphicon glyphicon-volume-down').addClass('glyphicon glyphicon-volume-up')
	else if(volume < 0.5 && volume > 0)
		elements.video.volume.removeClass('glyphicon glyphicon-volume-off').removeClass('glyphicon glyphicon-volume-up').addClass('glyphicon glyphicon-volume-down')
	else if(volume == 0)
		elements.video.volume.removeClass('glyphicon glyphicon-volume-down').removeClass('glyphicon glyphicon-volume-up').addClass('glyphicon glyphicon-volume-off')
});

// elements.video.panel.mouseenter(function (){
	// elements.video.bar.slideToggle("fast");
// })

// elements.video.panel.mouseleave(function (){
	// elements.video.bar.slideToggle("fast");
// })