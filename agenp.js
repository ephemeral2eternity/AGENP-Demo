var app = angular.module('AGENP', []);

app.directive('chart', function() {
    return {
        restrict: 'E',
        link: function (scope, elem, attrs) {
            var chart = null,
                options = {
                    series: {
                        shadowSize: 0
                    },
                    yaxis: {
                        min: 0,
                        max: 6
                    },
                    xaxis: {
                        show: false
                    }
                };

            // If the data changes somehow, update it in the chart
            scope.$watch('bufferData', function(v) {
		console.log("The input value to draw is " + v);
                if (v === null || v === undefined) {
                    return;
                }

                if (!chart) {
                    chart = $.plot(elem, v , options);
                    elem.show();
                }
                else {
                    chart.setData(v);
                    chart.setupGrid();
                    chart.draw();
                }
            });

           scope.$watch('invalidateChartDisplay', function(v) {
                if (v && chart) {
                    var data = scope[attrs.ngModel];
                    chart.setData(data);
                    chart.setupGrid();
                    chart.draw();
                    scope.invalidateDisplay(false);
                }
           });
        }
    };
});

app.controller('DashController', function($scope){
	var player,
	    video,
	    context,
	    videoSeries = [],
	    audioSeries = [],
	    maxGraphPoints = 200;


	/////////////////////////////////////////////
	//
	// Apply the values to ng-controller safely
	//
	////////////////////////////////////////////
	$scope.safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if(phase == '$apply' || phase == '$digest')
			this.$eval(fn);
		else
			this.$apply(fn);
	};


	/////////////////////////////////////////////
	//
	// Compute QoE of each Chunk
	//
	////////////////////////////////////////////
	function computeQoE(metrics){
		var maxBitrate = metrics.maxBitratesValue;
		var curBitrate = metrics.bandwidthValue;
		var a1 = 1.3554;
		var a2 = 40;

		var QoE = a1 * Math.log(a2 * curBitrate / maxBitrate);
		return QoE;
	}

	/////////////////////////////////////////////
	//
	// Get Cribbed Video Metrics For Both Video and Audio
	//
	////////////////////////////////////////////
	function getCribbedMetricsFor(type) {
		var metrics = player.getMetricsFor(type),
		    metricsExt = player.getMetricsExt(),
		    repSwitch,
		    bufferLevel,
		    httpRequests,
		    droppedFramesMetrics,
		    bitrateIndexValue,
		    bandwidthValue,
		    pendingValue,
		    numBitratesValue,
		    maxBitratesValue,
		    bufferLengthValue = 0,
		    point,
		    movingLatency = {},
		    movingDownload = {},
		    movingRatio = {},
		    droppedFramesValue = 0,
		    fillmoving = function(type, Requests){
			var requestWindow,
			    downloadTimes,
			    latencyTimes,
			    durationTimes;

			requestWindow = Requests
			    .slice(-20)
			    .filter(function(req){return req.responsecode >= 200 && req.responsecode < 300 && !!req.mediaduration && req.type === "Media Segment" && req.stream === type;})
			    .slice(-4);
			if (requestWindow.length > 0) {

			    latencyTimes = requestWindow.map(function (req){ return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;});

			    movingLatency[type] = {
				average: latencyTimes.reduce(function(l, r) {return l + r;}) / latencyTimes.length, 
				high: latencyTimes.reduce(function(l, r) {return l < r ? r : l;}), 
				low: latencyTimes.reduce(function(l, r) {return l < r ? l : r;}), 
				count: latencyTimes.length
			    };

			    downloadTimes = requestWindow.map(function (req){ return Math.abs(req.tfinish.getTime() - req.tresponse.getTime()) / 1000;});

			    movingDownload[type] = {
				average: downloadTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length, 
				high: downloadTimes.reduce(function(l, r) {return l < r ? r : l;}), 
				low: downloadTimes.reduce(function(l, r) {return l < r ? l : r;}), 
				count: downloadTimes.length
			    };

			    durationTimes = requestWindow.map(function (req){ return req.mediaduration;});

			    movingRatio[type] = {
				average: (durationTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length) / movingDownload[type].average, 
				high: durationTimes.reduce(function(l, r) {return l < r ? r : l;}) / movingDownload[type].low, 
				low: durationTimes.reduce(function(l, r) {return l < r ? l : r;}) / movingDownload[type].high, 
				count: durationTimes.length
			    };
			}
		    };

		if (metrics && metricsExt) {
		    repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics);
		    bufferLevel = metricsExt.getCurrentBufferLevel(metrics);
		    httpRequests = metricsExt.getHttpRequests(metrics);
		    droppedFramesMetrics = metricsExt.getCurrentDroppedFrames(metrics);

		    fillmoving("video", httpRequests);
		    fillmoving("audio", httpRequests);

		    if (repSwitch !== null) {
			bitrateIndexValue = metricsExt.getIndexForRepresentation(repSwitch.to);
			// console.log(repSwitch.to);
			bandwidthValue = metricsExt.getBandwidthForRepresentation(repSwitch.to);
			bandwidthValue = bandwidthValue / 1000;
			bandwidthValue = Math.round(bandwidthValue);
		    }

		    numBitratesValue = metricsExt.getMaxIndexForBufferType(type);
		    maxBitratesValue = metricsExt.getBandwidthForRepresentation(numBitratesValue);
		    maxBitratesValue = maxBitratesValue / 1000;
		    maxBitratesValue = Math.round(maxBitratesValue);

		    if (bufferLevel !== null) {
			bufferLengthValue = bufferLevel.level.toPrecision(5);
		    }

		    if (droppedFramesMetrics !== null) {
			droppedFramesValue = droppedFramesMetrics.droppedFrames;
		    }

		    if (isNaN(bandwidthValue) || bandwidthValue === undefined) {
			bandwidthValue = 0;
		    }

		    if (isNaN(bitrateIndexValue) || bitrateIndexValue === undefined) {
			bitrateIndexValue = 0;
		    }

		    if (isNaN(numBitratesValue) || numBitratesValue === undefined) {
			numBitratesValue = 0;
		    }

		    if (isNaN(bufferLengthValue) || bufferLengthValue === undefined) {
			bufferLengthValue = 0;
		    }

		    pendingValue = player.getQualityFor(type);

		    return {
			bandwidthValue: bandwidthValue,
			bitrateIndexValue: bitrateIndexValue + 1,
			pendingIndex: (pendingValue !== bitrateIndexValue) ? "(-> " + (pendingValue + 1) + ")" : "",
			numBitratesValue: numBitratesValue,
			maxBitratesValue: maxBitratesValue,
			bufferLengthValue: bufferLengthValue,
			droppedFramesValue: droppedFramesValue,
			movingLatency: movingLatency,
			movingDownload: movingDownload,
			movingRatio: movingRatio
		    }
		}
		else {
		    return null;
		}
	}

	/////////////////////////////////////////////
	//
	// Apply Metric Change.
	//
	////////////////////////////////////////////
	function metricChanged(e) {
		var metrics,
		    QoE,
		    point,
		    treeData;


		if (e.data.stream == "video") {
		    metrics = getCribbedMetricsFor("video");
		    QoE = computeQoE(metrics);
		    if (metrics) {
			$scope.videoBitrate = metrics.bandwidthValue;
			$scope.videoIndex = metrics.bitrateIndexValue;
			$scope.videoPendingIndex = metrics.pendingIndex;
			$scope.videoMaxIndex = metrics.numBitratesValue;
			$scope.videoMaxBitrate = metrics.maxBitratesValue;
			$scope.videoBufferLength = metrics.bufferLengthValue;
			$scope.videoDroppedFrames = metrics.droppedFramesValue;
			$scope.QoE = QoE;
			if (metrics.movingLatency["video"]) {
			    $scope.videoLatencyCount = metrics.movingLatency["video"].count;
			    $scope.videoLatency = metrics.movingLatency["video"].low.toFixed(3) + " < " + metrics.movingLatency["video"].average.toFixed(3) + " < " + metrics.movingLatency["video"].high.toFixed(3);
			}
			if (metrics.movingDownload["video"]) {
			    $scope.videoDownloadCount = metrics.movingDownload["video"].count;
			    $scope.videoDownload = metrics.movingDownload["video"].low.toFixed(3) + " < " + metrics.movingDownload["video"].average.toFixed(3) + " < " + metrics.movingDownload["video"].high.toFixed(3);
			}
			if (metrics.movingRatio["video"]) {
			    $scope.videoRatioCount = metrics.movingRatio["video"].count;
			    $scope.videoRatio = metrics.movingRatio["video"].low.toFixed(3) + " < " + metrics.movingRatio["video"].average.toFixed(3) + " < " + metrics.movingRatio["video"].high.toFixed(3);
			}

			point = [parseFloat(video.currentTime), QoE];
			videoSeries.push(point);

			if (videoSeries.length > maxGraphPoints) {
			    videoSeries.splice(0, 1);
			}
		    }
		}

		if (e.data.stream == "audio") {
		    metrics = getCribbedMetricsFor("audio");
		    if (metrics) {
			$scope.audioBitrate = metrics.bandwidthValue;
			$scope.audioIndex = metrics.bitrateIndexValue;
			$scope.audioPendingIndex = metrics.pendingIndex;
			$scope.audioMaxIndex = metrics.numBitratesValue;
			$scope.audioBufferLength = metrics.bufferLengthValue;
			$scope.audioDroppedFrames = metrics.droppedFramesValue;
			if (metrics.movingLatency["audio"]) {
			    $scope.audioLatencyCount = metrics.movingLatency["audio"].count;
			    $scope.audioLatency = metrics.movingLatency["audio"].low.toFixed(3) + " < " + metrics.movingLatency["audio"].average.toFixed(3) + " < " + metrics.movingLatency["audio"].high.toFixed(3);
			}
			if (metrics.movingDownload["audio"]) {
			    $scope.audioDownloadCount = metrics.movingDownload["audio"].count;
			    $scope.audioDownload = metrics.movingDownload["audio"].low.toFixed(3) + " < " + metrics.movingDownload["audio"].average.toFixed(3) + " < " + metrics.movingDownload["audio"].high.toFixed(3);
			}
			if (metrics.movingRatio["audio"]) {
			    $scope.audioRatioCount = metrics.movingRatio["audio"].count;
			    $scope.audioRatio = metrics.movingRatio["audio"].low.toFixed(3) + " < " + metrics.movingRatio["audio"].average.toFixed(3) + " < " + metrics.movingRatio["audio"].high.toFixed(3);
			}

			point = [parseFloat(video.currentTime), Math.round(parseFloat(metrics.bufferLengthValue))];
			audioSeries.push(point);

			if (audioSeries.length > maxGraphPoints) {
			    audioSeries.splice(0, 1);
			}
		    }
		}

		$scope.invalidateDisplay(true);
		$scope.safeApply();
	}

	/////////////////////////////////////////////
	//
	// Player Setup
	//
	////////////////////////////////////////////

	video = document.querySelector("#videoPlayer");
	context = new Dash.di.DashContext();
	player = new MediaPlayer(context);
	$scope.version = player.getVersion();

	player.startup();
	player.addEventListener("metricChanged", metricChanged.bind(this));

	player.attachView(video);
	player.setAutoPlay(true);

	var url = "./BBB/MultiRes.mpd";
	player.attachSource(url);

	/////////////////////////////////////////////
	//
	// Debugging Purpose
	//
	////////////////////////////////////////////
    	$scope.invalidateChartDisplay = false;

    	$scope.invalidateDisplay = function (value) {
        	$scope.invalidateChartDisplay = value;
    	}
	$scope.bufferData = [
        	{
            		data: videoSeries,
            		label: "Video",
            		color: "#2980B9"
        	}
    	];
});
