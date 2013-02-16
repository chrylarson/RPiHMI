var socket = io.connect('127.0.0.1:8080/'); //set this to the ip address of your node.js server
var chart; // global

// on connection to server, ask for user's name with an anonymous callback
socket.on('connect', function(){
// call the server-side function 'adduser' and send one parameter (value of prompt)
//socket.emit('adduser', 'Your Name Here');
});

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data) {
$('#conversation').append('<b>'+username + ':</b> ' + data + '<br>');
});

// listener, whenever the server emits 'updatechart', this updates the chart body
socket.on('updatechart', function (point, MYdate) {
var series = chart.series[0],
            shift = series.data.length > 20; // shift if the series is longer than 20
var pointarray = new Array();
pointarray[0] = MYdate;
pointarray[1] = point;
            // add the point
            chart.series[0].addPoint(pointarray, true, shift);
});

// listener, whenever the server emits 'updateusers', this updates the username list
socket.on('updateusers', function(data) {
$('#users').empty();
$.each(data, function(key, value) {
$('#users').append('<div>' + key + '</div>');
});
});

// listener, whenever the server emits 'updateusers', this updates the username list
socket.on('updatevalve', function(data) {
$('#users').empty();
$.each(data, function(key, value) {
$('#users').append('<div>' + key + '</div>');
});
});

// listener, whenever the server emits 'openvalve', this updates the username list
socket.on('openvalve', function(username, data) {
$('#' + data + ' > div.feedback > div.circle.status').removeClass('red').addClass('green');
});
socket.on('opencmd', function(username, data) {
$('#' + data + ' > div.feedback > div.circle.status > div.circle.command').removeClass('red').addClass('green');
});

// listener, whenever the server emits 'openvalve', this updates the username list
socket.on('closevalve', function(username, data) {
$('#' + data + ' > div.feedback > div.circle.status').removeClass('green').addClass('red');
});
socket.on('closecmd', function(username, data) {
$('#' + data + ' > div.feedback > div.circle.status > div.circle.command').removeClass('green').addClass('red');
});
// on load of page
$(function(){
// when the client clicks SEND
$('#datasend').click( function() {
var message = $('#data').val();
$('#data').val('');
// tell server to execute 'sendchat' and send along one parameter
socket.emit('sendchat', message);
});

// when the client hits ENTER on their keyboard
$('#data').keypress(function(e) {
if(e.which == 13) {
$(this).blur();
$('#datasend').focus().click();
}
});

// when the client clicks OPEN
$('.openvalve').click( function() {
var id = $(this).parent().attr("id");
//console.log(id);
socket.emit('opencmd', id);
});

// when the client clicks CLOSE
$('.closevalve').click( function() {
var id = $(this).parent().attr("id");
//console.log(id);
socket.emit('closecmd', id);
});

});

// Horizontal slider
$("#v-slider").slider({
    orientation: "horizontal",
    range: "min",
    min: 0,
    max: 100,
    value: 60,
    slide: function (event, ui) {
    	var stime = new Date().getTime();
    	var id = $(this).parent().attr("id");
        $("#amount").val(ui.value);
		socket.emit('analog', ui.value, id);
    }
});
$("#amount").val($("#v-slider").slider("value"));

$(function(){
	Highcharts.setOptions({
		global: {
			useUTC: false
		}
	});

    chart = new Highcharts.Chart({
        chart: {
            renderTo: 'chart1',
            defaultSeriesType: 'spline'
        },
        title: {
            text: 'Live Arduino Data'
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,
            maxZoom: 20 * 1000
        },
        yAxis: {
            minPadding: 0.2,
            maxPadding: 0.2,
            title: {
                text: 'Volts',
                margin: 20
            }
        },
        series: [{
            name: 'solar panel volts',
            data: []
        }]
    });
});
