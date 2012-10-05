var jQT = $.jQTouch({
    formSelector: false,
    icon: 'icon.png',
    startupScreen: 'Default.png',
    statusBar: 'black', 
    useFastTouch: false,
    preloadImages: [
        'themes/jqt/img/back_button.png',
        'themes/jqt/img/back_button_clicked.png',
        'themes/jqt/img/button_clicked.png',
        'themes/jqt/img/grayButton.png',
        'themes/jqt/img/whiteButton.png',
        'themes/jqt/img/loading.gif'
    ]
});

var shortName = 'Kilo07';
var version = '1.0';
var displayName = 'Kilo';
var maxSize = 65536;
var db;
var arrTotalCal = [0,0,0,0,0,0];



$(document).ready(function(){
    if (typeof(PhoneGap) != 'undefined') {
        $('body > *').css({minHeight: '460px !important'});
    }
    // $('#about, #createEntry, #dates, #home, #settings').bind('touchmove', function(e){e.preventDefault()});
    $('#createEntry form').submit(createEntry);
    $('#editEntry form').submit(updateEntry);
    $('#settings form').submit(saveSettings);
	
    $('#date').bind('pageAnimationEnd', function(e, info){
        if (info.direction == 'in') {
            startWatchingShake();
        }
    });
    $('#date').bind('pageAnimationStart', function(e, info){
        if (info.direction == 'out') {
            stopWatchingShake();
        }
    });
	
    $('#settings').bind('pageAnimationStart', loadSettings);
	
    $('#dates li a').click(function(e){
        var dayOffset = this.id;
		//Bradut: exprim data ca un sir in formatul in: YYYY-MM-DD
		sessionStorage.currentDate = getFormattedDate(dayOffset);		
        refreshEntries();
    });
	
	
	//Bradut: attempt to update the days 0...day5 when user click on the main menu
	 $('#home li a').click(function(e){
		displayDailyCaloriesByDayOffset(0);
    });
	
    $('#share').click(function(e){
        try {
            navigator.ContactManager.chooseContact(function(contact){
                alert('got it');
            }, null);
        } catch(e) {
            alert('Contact Manager not available.');
        }
    });
/* 
    var shortName = 'Kilo';
    var version = '1.0';
    var displayName = 'Kilo';
    var maxSize = 65536; */
    db = openDatabase(shortName, version, displayName, maxSize);
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'CREATE TABLE IF NOT EXISTS entries (' +
                'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' + 
                'date DATE, food TEXT, calories INTEGER, ' + 
                'longitude TEXT, latitude TEXT);'
            );
        }
    );
	
	var abc = displayDailyCaloriesByDayOffset(0);
});


/*
Creates a string that represents the a date such as '2012-09-25'
param 'dayOffset' is an integer that will be subtracted from  the current date
*/
function getFormattedDate(dayOffset){
        //var dayOffset = this.id;
		var retValDate = '2012-31-01'
        var date = new Date();
        date.setDate(date.getDate() - dayOffset); //I subtract the dayOffset from the result of the getDate() function, and then use setDate() to repoint the date.

		//Here, I build a MM/DD/YYYY-formatted date string and save it to sessionStorage as currentDate.
		//The getMonth() method of the date object returns values from 0–11, January being 0. Therefore, I have to add 1 to it to generate the correct value for the formatted string.
		//Bradut: modific formatul in: YYYY-MM-DD
		var currMonth = date.getMonth() + 1;
		retValDate = date.getFullYear()+'-'+currMonth + '-' + date.getDate(); //date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear(); 
		return retValDate;
}

function loadSettings() {
    $('#age').val(localStorage.age);
    $('#budget').val(localStorage.budget);
    $('#weight').val(localStorage.weight);
}
function saveSettings() {
    localStorage.age = $('#age').val();
    localStorage.budget = $('#budget').val();
    localStorage.weight = $('#weight').val();
    jQT.goBack();
    return false;
}
function createEntry() {
   if ($.trim($('#food').val()) == ''){
		alert('Please enter the name of the food!');
		return false;
	}
	
   var isCreated = false; //Bradut: workaround for Safari JS which skips the "catch(e)"...
    try {
        navigator.geolocation.getCurrentPosition(
            function(position){
                console.log('geo success called');
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                insertEntry(latitude, longitude);
				isCreated = true;
            },
            function(){
                console.log('geo error called');
                insertEntry();
				isCreated = true;
            } 
        );
    } catch(e) {
        console.log('Catch called in createEntry');
        insertEntry();
		isCreated = true;
    }
	if (isCreated != true){ //Bradut: workaround
		//No need for this, as is duplicating the entries...
		//pauseComp(1000); //milliseconds//alert("isCreated "+ isCreated);
		//insertEntry();
	}
	
    return false;
}

function insertEntry(latitude, longitude) {
    var date = sessionStorage.currentDate;
    var calories = $('#calories').val();
    var food = $('#food').val();
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'INSERT INTO entries (date, calories, food, latitude, longitude) VALUES (?, ?, ?, ?, ?);', 
                [date, calories, food, latitude, longitude], 
                function(){
                    refreshEntries();
                    checkBudget();
                    jQT.goBack();
                }, 
                errorHandler
            );
        }
    );
}
function refreshEntries() {
    var currentDate = sessionStorage.currentDate;
    $('#date h1').text(currentDate);
    $('#date ul li:gt(0)').remove();
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'SELECT * FROM entries WHERE date = ? ORDER BY food;', 
                [currentDate], 
                function (transaction, result) {
                    for (var i=0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                        var newEntryRow = $('#entryTemplate').clone();
                        newEntryRow.removeAttr('id');
                        newEntryRow.removeAttr('style');
                        newEntryRow.data('entryId', row.id);
                        newEntryRow.appendTo('#date ul');
                        newEntryRow.find('.label').text(row.food);
                        newEntryRow.find('.calories').text(row.calories);
                        newEntryRow.find('.delete').click(function(e){
							if(confirm('Delete this item ?' + '\n'+row.food)){ //Bradut: 2012-09-13 - adaugat confirmare la stergere
								var clickedEntry = $(this).parent();
								var clickedEntryId = clickedEntry.data('entryId');
								deleteEntryById(clickedEntryId);
								clickedEntry.slideUp(); 
								e.stopPropagation();
							}
                           
                        });
                        newEntryRow.click(entryClickHandler);
                    }
                }, 
                errorHandler
            );
        }
    );
	displayDailyCaloriesByDate(currentDate);
}

function deleteEntryById(id) {
    db.transaction(
        function(transaction) {
            transaction.executeSql('DELETE FROM entries WHERE id=?;', [id], null, errorHandler);
        }
    );
}

function errorHandler(transaction, error) {
    var message = 'Oops. Error was: "'+error.message+'" (Code '+error.code+')';
    try {
        navigator.notification.alert(message, 'Error', 'Dang!');
    } catch(e) {
        alert(message);
    }
    return true;
}

/*
 Calculates and display the total calories/day in the list of days
*/
function displayDailyCaloriesByDayOffset(dayOffset){
	var currentDate = getFormattedDate(dayOffset);
	return displayDailyCaloriesByDate(currentDate);
}

function displayDailyCaloriesByDate(currentDate){
    var dailyBudget = localStorage.budget || 2000;

	var currentTotal = countDailyCalories(currentDate);
	if (currentTotal == 0){
		$('#caloriesDay0').text('');
	}
	else
	{
		$('#caloriesDay0').text(currentTotal);
	}
	
	if (currentTotal > dailyBudget){
		$('#caloriesDay0').css("backgroundColor", "Red");
	}
	else{
		$('#caloriesDay0').css("backgroundColor", "Transparent");
	}
}	

/*
Calculates the sum of the calories for a given date
Problem: the transaction is skipped in some instances !
*/
function countDailyCalories(currentDate) {
	var currentTotalxxx = 0; 
	var dbx = openDatabase(shortName, version, displayName, maxSize);
	dbx.transaction(
        function(tx) {
            tx.executeSql(
                'SELECT SUM(calories) AS currentTotal FROM entries WHERE date = ?;', 
                [currentDate], 
                function (tx, result) {
                    currentTotalxxx = result.rows.item(0).currentTotal;
                }, 
                errorHandler
            );
        }
    );
	
	return currentTotalxxx;
}


function checkBudget() {
    var currentDate = sessionStorage.currentDate;
    var dailyBudget = localStorage.budget || 2000;
	//var retVal = 0;
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'SELECT SUM(calories) AS currentTotal FROM entries WHERE date = ?;', 
                [currentDate], 
                function (transaction, result) {
                    var currentTotal = result.rows.item(0).currentTotal;
					
/* 					//Bradut: workaround //retVal = currentTotal;
					$('#caloriesDay0').text(currentTotal);
					if (currentTotal > dailyBudget){
						$('#caloriesDay0').css("backgroundColor", "Red");
					} */

                    if (currentTotal > dailyBudget) {
                        var overage = currentTotal - dailyBudget;
                        var message = 'You are '+overage+' calories over your daily budget. Better start jogging!';
                        try {
                            navigator.notification.beep();
                            navigator.notification.vibrate();
                        } catch(e){
                            // No equivalent in web app
                        }
                        try {
                            navigator.notification.alert(message, 'Over Budget', 'Dang!');
                        } catch(e) {
                            alert(message);
                        }
                    }
                }, 
                errorHandler
            );
        }
    );
	//return retVal;
}

function updateEntry() {
    var date = sessionStorage.currentDate;
    var calories = $('#editEntry input[name="calories"]').val();
    var food = $('#editEntry input[name="food"]').val();
    var latitude = $('#editEntry input[name="latitude"]').val();
    var longitude = $('#editEntry input[name="longitude"]').val();
    var id = sessionStorage.entryId;
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'UPDATE entries SET date=?, calories=?, food=?, latitude=?, longitude=? WHERE id=?;', 
                [date, calories, food, latitude, longitude, id], 
                function(){
                    refreshEntries();
                    checkBudget();
                    jQT.goBack();
                }, 
                errorHandler
            );
        }
    );
    return false;
}

function entryClickHandler(e){
    sessionStorage.entryId = $(this).data('entryId');
    db.transaction(
        function(transaction) {
            transaction.executeSql(
                'SELECT * FROM entries WHERE id = ?;', 
                [sessionStorage.entryId], 
                function (transaction, result) {
                    var row = result.rows.item(0);
                    var food = row.food;
                    var calories = row.calories;
                    var latitude = row.latitude;
                    var longitude = row.longitude;
                    $('#editEntry input[name="food"]').val(food);
                    $('#editEntry input[name="calories"]').val(calories);
                    $('#editEntry input[name="latitude"]').val(latitude);
                    $('#editEntry input[name="longitude"]').val(longitude);
                    $('#saveChanges').click(function(){
                        // alert('submitted');
                        // $('#editEntry form').submit();
                        updateEntry();
                    });
                    $('#mapLocation').click(function(){
                        window.location = 'http://maps.google.com/maps?z=15&q='+food+'@'+latitude+','+longitude;
                    });
                    jQT.goTo('#editEntry', 'slideup');
                }, 
                errorHandler
            );
        }
    );
}
function dupeEntryById(entryId) {
    console.log('dupeEntryById called with id: ' + entryId);
    if (entryId == undefined) {
        console.log('You have to have at least one entry in the list to shake out a dupe.');
    } else {
        db.transaction(
            function(transaction) {
                transaction.executeSql(
                    'INSERT INTO entries (date, food, calories, latitude, longitude) SELECT date, food, calories, latitude, longitude FROM entries WHERE id = ?;', 
                    [entryId], 
                    function () {
                        console.log('Success called.');
                        refreshEntries();
                    }, 
                    errorHandler
                );
            }
        );
    }
}
function startWatchingShake() {
    try {
        debug.log('startWatchingShake called');
        var success = function(coords){
            var max = 2;
            if (Math.abs(coords.x) > max || Math.abs(coords.y) > max || Math.abs(coords.z) > max) {
                debug.log('dupe called');
                var entryId = $('#date ul li:last').data('entryId');
                dupeEntryById(entryId);
            }
        };
        var error = function(){};
        var options = {};
        options.frequency = 100;
        sessionStorage.watchId = navigator.accelerometer.watchAcceleration(success, error, options);
    } catch(e) {
        console.log('Catch called in startWatchingShake');
    }
}
function stopWatchingShake() {
    try {
        debug.log('stopWatchingShake called');
        navigator.accelerometer.clearWatch(sessionStorage.watchId);
    } catch(e) {
        console.log('Catch called in stopWatchingShake');
    }
}

function pauseComp(millis) 
{
	var date = new Date();
	var curDate = null;

	do { curDate = new Date(); } 
	while(curDate-date < millis);
} 

