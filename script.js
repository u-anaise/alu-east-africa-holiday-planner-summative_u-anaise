var allHolidays = [];
var currentLabel="";
var dayNames=["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var countrySelect=document.getElementById("country");
var yearInput=document.getElementById("year");
var loadButton=document.getElementById("loadButton");
var filters=document.getElementById("filters");
var searchInput=document.getElementById("search");
var monthSelect=document.getElementById("month");
var sortSelect=document.getElementById("sort");
var messageBox=document.getElementById("message");
var table=document.getElementById("results");
var tableBody=document.getElementById("resultsBody");

function showMessage(text, isError){
  messageBox.textContent=text;
  if(isError) {
    messageBox.className="error";
  }else {
    messageBox.className="";
  }
}

async function fetchFromApi(country, year) {
  var url="https://calendarific.com/api/v2/holidays?api_key=" + API_KEY + "&country=" + country + "&year=" + year;
  var response;
  try {
    response=await fetch(url);
  }catch (error) {
    throw new Error ("Could not reach the holiday service. Check your internet connection and try again.");
  }
  if (response.status===401) {
    throw new Error ("The API key was rejected. Check the key in config.js.");
  }
  if(response.status===429) {
    throw new Error("The monthly request limit has reached. Please try again later.");
  }
  if(!response.ok) {
    throw new Error("The holiday service had a problem (code " + response.status + "). Please try again later.");
  }
  var data;
  try {
    data=await response.json();
  } catch (error) {
    throw new Error("The holiday service sent back something unreadable. Please try again.");
  }
  if(!data.response || !data.response.holidays) {
    throw new Error("The holiday service sent back data in an unexpected format.");
  }

  var list = [];
  for(var i=0; i<data.response.holidays.length; i++) {
    var h= data.response.holidays[i];
    var iso=h.date.iso.slice(0, 10);
    var parts=iso.split("-");
    var type="Holiday";
    if (h.type && h.type.length > 0) {
      type=h.type[0];
    }
    list.push({
      name: h.name,
      iso: iso,
      year: Number(parts[0]),
      month: Number(parts[1]),
      day: Number(parts[2]),
      type: type
    });
  }
  return list;
}

function readSaved(key) {
  try {
    var saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse (saved);
    }
  } catch (error) {

  }
  return null;
}

function saveCopy (key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch(error) {

  }
}

async function loadHolidays() {
  var country = countrySelect.value;
  var year = Number(yearInput.value);

  if(!Number.isInteger(year) || year<2000 || year>2100) {
    showMessage("Please enter a year between 2000 and 2100.", true);
    return;
  }
  if (typeof API_KEY === "undefined" || API_KEY === "PUT_YOUR_KEY_HERE") {
    showMessage("No API key found. Copy config.example.js to config.js and add your key.", true);
    return;
  }
  var key = "holidays-" + country  + "-" + year;
  currentLabel = countrySelect.options[countrySelect.selectedIndex].text + " in " + year;
  var list=readSaved(key);
  var fromSaved= (list !== null);
  if(!fromSaved) {
    showMessage("Loading holidays...", false);
    loadButton.disabled = true;
    try {
      list = await fetchFromApi(country, year);
      saveCopy(key, list);
    } catch (error) {
      showMessage(error.message, true);
      loadButton.disabled = false;
      return;
    }
    loadButton.disabled = false;
  }
  if (list.length === 0) {
    allHolidays = [];
    filters.hidden=true;
    table.hidden= true;
    showMessage("No holidays were found for " + currentLabel + ".", false);
    return;
  }
  allHolidays = list;
  filters.hidden = false;
  showTable();
}

function compareByDate(a, b) {
  if (a.iso < b.iso) {
    return -1;
  }
  if(a.iso > b.iso) {
    return 1;
  }
  return 0;
}

function addCell(row, text) {
  var cell=document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

function daysToGo(holiday, today) {
  var date = new Date(holiday.year, holiday.month - 1, holiday.day);
  var diff = Math.round((date - today)/86400000);
  if (diff<0) {
    return "Passed";
  }
  if (diff === 0) {
    return "Today";
  }
  return String(diff);
}

function showTable() {
  var search = searchInput.value.trim().toLowerCase();
  var month=Number(monthSelect.value);
  var shown=[];
  for(var i=0; i<allHolidays.length; i++) {
    var h=allHolidays[i];
    var nameMatches=h.name.toLowerCase().includes(search);
    var monthMatches=(month === 0 || h.month === month);
    if (nameMatches && monthMatches) {
      shown.push(h);
    }
  }

  var sortChoice = sortSelect.value;
  if (sortChoice === "dateAsc") {
    shown.sort(compareByDate);
  } else if(sortChoice === "dateDesc") {
    shown.sort(function (a,b) {
      return compareByDate(b, a);
    });
  } else {
    shown.sort(function (a,b) {
      return a.name.localeCompare(b.name);
    });
  }

  tableBody.textContent = "";

  if (shown.length === 0) {
    table.hidden = true;
    showMessage("No holidays match your search or filter.", false);
    return;
  }

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (var j=0; j<shown.length; j++) {
    var holiday = shown[j];
    var date= new Date(holiday.year, holiday.month -1, holiday.day);
    var weekday = date.getDay();

    var row= document.createElement("tr");
    addCell(row, holiday.iso);
    addCell(row, dayNames[weekday]);
    var nameCell = addCell(row, holiday.name);
    if (weekday === 1 || weekday === 5) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Long weekend";
      nameCell.appendChild(tag);
    }
    addCell(row, holiday.type);
    addCell(row, daysToGo(holiday, today));
    tableBody.appendChild(row);
  }
  table.hidden = false;
  showMessage("Showing " + shown.length + " of " + allHolidays.length + " holidays for " + currentLabel + ".", false);
}

loadButton.addEventListener("click", loadHolidays);
searchInput.addEventListener("input", showTable);
monthSelect.addEventListener("change", showTable);
sortSelect.addEventListener("change", showTable);