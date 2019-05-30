//I need to wrap many of these functions in a try catch and add a finally to the interrogator script to run getTasks after all updates are pushed. Also messagebox any errors. 

//would also be great if I can create a function to force validation for Assignee name. (Look at header row find 'assignee name' then vlookup)   

//
//remove the 'f' and set to run interrogator on open if yes clicked
function onfOpen() {
var response = Browser.msgBox('Update sheet data from Asana?', 'This can interupt others if someone is currently editing this sheet!', Browser.Buttons.YES_NO);
if (response == "yes") {
  Logger.log('Yup, do it!');
} else {
  Logger.log('DONT DO IT!');
} 
}



function interrogator() {

var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheets()[0];
var lastRow = sheet.getLastRow()-1;
var lastColumn = sheet.getLastColumn();
//getRange(row, column, numRows, numColumns) <- this is just a reference for 
var range = sheet.getRange(2, 1, lastRow, lastColumn); // Working on something else right now but it looks like I have lastrow in the wrong place here even though it's currently working this could be impoved. I will need to fix this before it's creating an addon...................................... <--- Fix this! 
var values = range.getValues();

var exact =[];
//for row = (do something for each row)
for (var row in values) {

//The value '1124040208584602' maps to a specific task. once complete this will be updated so that if an ID isn't present it will create the task and otherwise only update the task. 
//need to create a function to return new task ID's. 
    if(values[row][0].length =="16"){
//    Logger.log(values[row][0]+" yay");
    
    var tid = values[row][0];
    var towner = values[row][1];
    var tname = values[row][2];
    var tdescription = values[row][3];
    var twhatsuccess = values[row][4];
    var toutcome = values[row][5];
    var tManagerComments = values[row][6];
    var tlinks = values[row][7];
    //Because API needs an email or ID instead of a name, using findemail with a generated helper sheet to provide a valid email. 
    //Need a new function to validate email addresses so if an email is passed we can bypass findemail. Such function is currently commented inside the findemail function. 
    var temail = findemail(towner);
    
    Logger.log("taskID: "+tid+", Owner: "+towner+ ", Description: "+tdescription+", success?: "+twhatsuccess+", Outcome?: "+toutcome+", Manager Comments?: "+tManagerComments+", links: "+tlinks+", Email: "+temail);
       
    

    // taskid,Owner,SprintName,SprintDescription,WhatSuccesslookslike,OutcomeEOM,ManagerComments,Links
    //Logger.log(tid+" "+towner+" "+tname+" "+ tdescription+" "+twhatsuccess+" "+tManagerComments+" "+tlinks);
    var issuccess = updateTask(tid,temail,tname,tdescription,twhatsuccess,toutcome,tManagerComments,tlinks);
    };
    
                      //For col = (do something for each column of each row:(when the col arg is inside for row loop))
                      for (var col in values[row]) {
                        //Logger.log(issuccess);
                      }
}//end of interrogator


//For add task
// var taskname = "This is a task"
// var projectId = "1122314604036127"


//for update task
//var taskid = "1123596000228623"; //these will all be updated by interrogator 
//var Owner = null;  //"michelle.fux@uber.com" // (=null - removes assignee)
//var SprintName = "End of May review";
//var SprintDescription = "This is an updated description";
//var WhatSuccesslookslike = "It's looking great";
//var OutcomeEOM = "The one you expected";
//var ManagerComments = "This is a comment from management";
//var Links ="www.google.com";

//addTask(taskname,projectId);
//updateTask(taskid,Owner,SprintName,SprintDescription,WhatSuccesslookslike,OutcomeEOM,ManagerComments,Links);

}

function findemail(tname) {

var sheet = SpreadsheetApp.getActive().getSheetByName('owner emails');
//if the email sheet doesn't exist, we can run the getEmails function to create it. This will include everyone already assigned a task in the asana project. We can also use email addresses instead of names. I can create a check for this in the future. 
//Below is an email validation function that can be used to pass emails when a name isn't used. Good for setting up a new project.
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Open in Python Editor 
//function validateEmail(email) {
//    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
//    return re.test(String(email).toLowerCase());
//}

if (sheet == null) {
    getEmails();
    var sheet = SpreadsheetApp.getActive().getSheetByName('owner emails');
    }

//var sheet = SpreadsheetApp.getActive().getSheetByName('owner emails');
//var sheet = ss.getSheets()[0];
var lastRow = sheet.getLastRow()-1;
var lastColumn = sheet.getLastColumn();
//getRange(row, column, numRows, numColumns)
var range = sheet.getRange(1, 1, lastRow,lastColumn);
var values = range.getValues();
//Logger.log(values);

for (var row in values) {
    if(values[row][0]==tname){ 
    var temail = values[row][1];
 //   Logger.log(temail);
    return(temail);
    };
  }


}


function getTasks(){

//var ss = SpreadsheetApp.getActiveSpreadsheet();
//var sheet = ss.getSheets()[1];
//var lastRow = sheet.getLastRow()-1;
//var lastColumn = sheet.getLastColumn();
//var range = sheet.getRange(2, 1, 3, lastRow);
//var values = range.getValues();


  //https://app.asana.com/api/1.0/tasks/
  var projectId = "1122314604036127"; //Project ID 
  var token = "0/8556d9086c0ab0449a251489df99359e"; //Asana Personal Access Token
  var bearerToken = "Bearer " + token;
  var exact = [];
  
  //use these in browser to identify field names
  //https://app.asana.com/api/1.0/projects/1122314604036127/tasks?
  //opt_fields=name,assignee.name,notes,custom_fields,workspace
 
  
  
  //adding headers to the array
  exact.push(['Task_ID','Owner','Sprint Name','Sprint Description','What success looks like','Outcome (fill in end of month)','Manager/ Sri comments','Links to sprint files/ folders']);

//Request options and payload
  var options = {
    "method" : "GET",
    "headers" : {"Authorization": bearerToken}, 
    "contentType": 'application/json'
  };
  try { 
    var url = "https://app.asana.com/api/1.0/projects/" + projectId + "/tasks?opt_fields=name,assignee.name,notes,custom_fields,workspace";
    var result = UrlFetchApp.fetch(url, options);
    var reqReturn = result.getContentText();//JSON.parse()
    var json = JSON.parse(reqReturn); 
  }
  catch (e) {
    Logger.log(e);
  }

for(var k in json.data)  if (json.data[k].assignee) {
//var task_id = json.data[k].gid;
//Logger.log(task_id);
var workspace = json.data[k].workspace
var asiojd = workspace.toString();
//Logger.log(json);
//var assignee = json.data[k].assignee.name;
//var task_name = json.data[k].name;
//var notes = json.data[k].notes;
//var success = json.data[k].custom_fields[0].text_value;
//var outcome = json.data[k].custom_fields[1].text_value;
//var Manager_comments = json.data[k].custom_fields[2].text_value;
//var task_links = json.data[k].custom_fields[3].text_value;
exact.push([json.data[k].gid, json.data[k].assignee.name, json.data[k].name,json.data[k].notes,json.data[k].custom_fields[0].text_value,json.data[k].custom_fields[1].text_value,json.data[k].custom_fields[2].text_value,json.data[k].custom_fields[3].text_value])
} else {
exact.push([json.data[k].gid,' ', json.data[k].name,json.data[k].notes,json.data[k].custom_fields[0].text_value,json.data[k].custom_fields[1].text_value,json.data[k].custom_fields[2].text_value,json.data[k].custom_fields[3].text_value])
};
 return(exact);
}


// We need to run update task on the returned task ID to add any other features of the task beyond the name of said task. 
function addTask(taskname,projectId) {
  //var projectId = "1122314604036127"; //Project ID 
  var token = "0/8556d9086c0ab0449a251489df99359e"; //Asana Personal Access Token
  var bearer = "Bearer " + token;
  var url = "https://app.asana.com/api/1.0/tasks/";
  
 var options = {
   "method": "post",
   "headers": {
     "Authorization": bearer
   },
   "contentType": "application/json",
   "payload": JSON.stringify({
       "data": {
  "name":taskname,
  "projects": projectId
           }
         })
  };
      var result = UrlFetchApp.fetch(url, options); //UrlFetchApp.fetch("https://app.asana.com/api/1.0/tasks/", options);
      //Logger.log(result);

}

function updateTask(taskid,Owner,SprintName,SprintDescription,WhatSuccesslookslike,OutcomeEOM,ManagerComments,Links){
  //Custom field ID's 
  var successId = "1123893816852000"
  var outcomeId = "1124040222760006";
  var ManagerCommentsId ="1124040222760010";
  var linksId = "1124040624693028";
  
  var token = "0/8556d9086c0ab0449a251489df99359e"; //Asana Personal Access Token
  var bearer = "Bearer " + token;
  var url = "https://app.asana.com/api/1.0/tasks/"+taskid;
//Need to add each of these as a param to pass here   
  //exact.push(['Task_ID','Owner','Sprint Name','Sprint Description','What success looks like','Outcome (fill in end of month)','Manager/ Sri comments','Links to sprint files/ folders']);

 var options = {
   "method": "put",
   "headers": {
     "Authorization": bearer
   },
   "contentType": "application/json",
   "payload": JSON.stringify({
       "data": {
  "assignee":Owner,
  "name":SprintName,
  "notes":SprintDescription,
  "custom_fields":{
  "1123893816852000":WhatSuccesslookslike,
  "1124040222760006":OutcomeEOM,
  "1124040222760010":ManagerComments,
  "1124040624693028":Links
  }
           }
         })
  };
      var result = UrlFetchApp.fetch(url, options); //UrlFetchApp.fetch("https://app.asana.com/api/1.0/tasks/", options);
      //Logger.log(result);
      return(result);

}


//This function returns the name and email address for everyone assigned a task in the asana project and places this information on a new sheet 'owner emails'
function getEmails(){

  var projectId = "1122314604036127"; //Project ID 
  var token = "0/8556d9086c0ab0449a251489df99359e"; //Asana Personal Access Token
  var bearerToken = "Bearer " + token;
  var exact = [];
 
var sheet = SpreadsheetApp.getActive().getSheetByName('owner emails');
//var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

//sheet.getRange('a1').setValue('Whenever it is a damp, drizzly November in my soul...');

if (sheet == null) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet();
    sheet.setName("owner emails");
    var sheet = ss.getSheetByName("owner emails");
    }
    
     var options = {
    "method" : "GET",
    "headers" : {"Authorization": bearerToken}, 
    "contentType": 'application/json'
    };
    
    
  try {
    var url = "https://app.asana.com/api/1.0/projects/" + projectId + "/tasks?opt_fields=name,assignee.name,assignee.email";
    var result = UrlFetchApp.fetch(url, options);
    var reqReturn = result.getContentText();//JSON.parse()
    var json = JSON.parse(reqReturn); 
    }
    catch (e) {
    Logger.log(e);
    }
  
 //Shoudl add these params to the top leaving below for simplicty during dev. 
  var j = 1;
  var Dup = [];
  //^ these params.
  
  for(var k in json.data)  if (json.data[k].assignee) {
      var assignee = json.data[k].assignee.name;
      var assigneeEmail = json.data[k].assignee.email;
          if (Dup.includes(json.data[k].assignee.email)){
          } else {
     // Logger.log("assignee: "+assignee+", Email: "+assigneeEmail);
      //getRange(row, column, numRows, numColumns)
      sheet.getRange(j,1,1).setValue(assignee);
      sheet.getRange(j,2,1).setValue(assigneeEmail);
      Dup.push(assigneeEmail);
       j++;
       }
      }
  //Logger.log("this is it");
}


    //This is a nifty script that add the '.includes' to the array prototype for gas: 
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }
      while (k < len) {
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}