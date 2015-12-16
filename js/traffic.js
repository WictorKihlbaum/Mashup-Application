// JavaScript Document
'use strict';

var Traffic = {
	
	srURL: 'http://api.sr.se/api/v2/traffic/messages?format=json&indent=true&size=',
	srResponse: {},
	messageCategory: 'Alla',
	map: {},
	layerGroupAll: L.layerGroup(),
	layerGroupFiltered: L.layerGroup(),
	
	
	init: function() {
		
		Traffic.getSRMessages('100'); // '100' is the default number of hits I want.
		Traffic.renderMap();
		Traffic.addEventListeners();
	},
	
	renderMap: function() {
		
		var mapboxTiles = L.tileLayer('https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoid2ljdG9yIiwiYSI6ImNpaTBheXR6YTA0c2N0bG0xcWxlczVsbXIifQ.st0JA1A7H7YkpwuOmlmWDg', {
			attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
		});
				
		Traffic.map = L.map('map')
			.addLayer(mapboxTiles)
			.setView([60.118387215202524, 15.001202453613246], 6);
	},
	
	createMapMarkers: function(messages) {
		
		Traffic.clearMapFromMarkers();
		
		for (var i = 0; i < messages.length; i++) {
			
			if (Traffic.messageCategory === 'Alla') {
				
				var marker = Traffic.createMarker(messages[i]);
				Traffic.layerGroupAll.addLayer(marker);
				
			} else if (messages[i].category == Traffic.messageCategory) {
				
				var marker = Traffic.createMarker(messages[i]);
				Traffic.layerGroupFiltered.addLayer(marker);
			}
		}
		
		Traffic.setOutMapMarkers();
	},
	
	clearMapFromMarkers: function() {
		
		Traffic.map.removeLayer(Traffic.layerGroupAll);
		Traffic.map.removeLayer(Traffic.layerGroupFiltered);
		Traffic.layerGroupAll.clearLayers();
		Traffic.layerGroupFiltered.clearLayers();
	},
	
	createMarker: function(message) {
		
		return L.marker([message.latitude, message.longitude], {icon: Traffic.setMarkerColor(message.priority)})
					.bindPopup('<strong>Titel</strong>: ' + message.title + '<br />' +
							   '<strong>Datum</strong>: ' + Traffic.formatDateTime(message.createddate) + '<br />' +
							   '<strong>Beskrivning</strong>: ' + message.description + '<br />' +
							   '<strong>Kategori</strong>: ' + Traffic.showCategory(message.category) + '<br />' +
							   '<strong>Underkategori</strong>: ' + message.subcategory + '<br />' +
							   '<strong>Prioritet</strong>: ' + message.priority)
					.openPopup();
			
	},
	
	showCategory: function(category) {
		
		switch (category) {
			
			case 0: return 'Vägtrafik';
			case 1: return 'Kollektivtrafik';
			case 2: return 'Planerad störning';
			case 3: return 'Övrigt';
			
			default: break;
		}
	},
	
	setMarkerColor: function(priority) {
		
		var color = '';
		
		switch (priority) {
		
			case 1: color = 'red'; break;
			case 2: color = 'orange'; break;
			case 3: color = 'yellow'; break;
			case 4: color = 'blue'; break;
			case 5: color = 'green'; break;
			
			default: break;	
		}
		
		var imageURL = 'css/images/' + color + '_marker_small.png';
		
		return L.icon({
			iconUrl: imageURL,
		
			iconSize:     [34, 34], // Size of the icon.
			iconAnchor:   [17, 34], // Point of the icon which will correspond to marker's location.
			popupAnchor:  [0, -40] // Point from which the popup should open relative to the iconAnchor.
		});
	},
	
	setOutMapMarkers: function() {
		
		if (Traffic.messageCategory === 'Alla') {
			
			Traffic.layerGroupAll.addTo(Traffic.map);
			
		} else {
			
			Traffic.layerGroupFiltered.addTo(Traffic.map);
		}
	},
	
	addEventListeners: function() {
	
		var buttons = document.getElementsByClassName('filter-button');
		
		for (var i = 0; i < buttons.length; i++) {
			
			buttons[i].addEventListener("click", Traffic.filterMessageCategories, false);
			buttons[i].myParam = buttons[i].value;
		}
	},
	
	filterMessageCategories: function(category) {
		
		Traffic.messageCategory = category.target.myParam;
		Traffic.processMessageInfo(Traffic.srResponse.messages);
	},
	
	getSRMessages: function(addOnURL) {
		
		var response;
		var xhr = new XMLHttpRequest();
		
		xhr.onreadystatechange = function() {
			
			if (xhr.readyState === 4) {
				
				if (xhr.status === 200) {
					
					response = JSON.parse(xhr.responseText);
				
					// If there are more messages than requested call this function again with totalhits as parameter.
					if (response.pagination.totalhits > response.pagination.size) {
						
						Traffic.getSRMessages(response.pagination.totalhits);
						
					} else {
						
						 if (typeof(localStorage) !== 'undefined') {
							localStorage.clear(); 
							localStorage.setItem('messages', xhr.responseText); 
						 }
					
						Traffic.srResponse = response;
						Traffic.handleResponse(response);	
					}	
					
				} else {
					
					response = JSON.parse(localStorage.getItem('messages'));
					
					Traffic.srResponse = response;
					Traffic.handleResponse(response);
				}
			}
		};
		
		xhr.open("GET", Traffic.srURL + addOnURL, true);
		xhr.send(null);
	},
	
	handleResponse: function(response) {
		
		var messages = response.messages;
		Traffic.processMessageInfo(messages);
	},
	
	processMessageInfo: function(messages) {
		
		var infoList = [];
		
		for (var i = 0; i < messages.length; i++) {
			
			if (Traffic.messageCategory === 'Alla') {
				
				infoList.push(Traffic.summariseMessage(messages[i]));
				
			} else if (messages[i].category == Traffic.messageCategory) {
				
				infoList.push(Traffic.summariseMessage(messages[i]));
			}
		}
		// Sort array by date.
		infoList = infoList.sort(Traffic.sortInfoList); 
		// Format date.
		for (var j = 0; j < infoList.length; j++) {
			infoList[j][0] = Traffic.formatDateTime(infoList[j][0]);
		}
		
		Traffic.renderTrafficInfo(infoList);
		Traffic.createMapMarkers(messages);
	},
	
	sortInfoList: function(a, b) {
		
		if (a[0] < b[0]) return 1;
		if (a[0] > b[0]) return -1;
		
		return 0;
	},
	
	summariseMessage: function(message) {
		
		var messages = [];
		
		messages.push(
			message.createddate,
			Traffic.showCategory(message.category),
			message.subcategory,
			message.title,
			message.description
		);
		
		return messages;
	},
	
	renderTrafficInfo: function(infoList) {
		
		var tableRows = '';
		
		for (var i = 0; i < infoList.length; i++) {
		
			tableRows += '<tr>';
		
			for (var j = 0; j < infoList[i].length; j++) {
				
				tableRows += '<td>' + infoList[i][j] + '</td>';
			}
			
			tableRows += '</tr>';	
		}
	
		document.getElementById('traffic-tbody').innerHTML = tableRows;
	},
	
	formatDateTime: function(date) {
		
		date = date.replace('/Date(', '');
		var formatedDate = new Date(parseInt(date));
		
		formatedDate = 
			formatedDate.getDate() + ' / ' + 
			(formatedDate.getMonth() + 1) + ' / ' + 
			formatedDate.getFullYear() + '<br />(Kl. ' +
			('0' + formatedDate.getHours()).slice(-2) + ':' +
			('0' + formatedDate.getMinutes()).slice(-2) + ')';
		
		return formatedDate;
	}
	
};

window.onload = Traffic.init;