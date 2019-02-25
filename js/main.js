"use strict";


var botToken = "";
var updateOffset = -1;
var updateAnalyzer;
var cookies = getCookies();
var commands = {};
var started = 0;
$(document).ready(function() {
  if("commands" in cookies) {
    $("#commands").val(cookies["commands"].split("///////////").join("\n"));
  } else $("#commands").val("/start > Messaggio di avvio!\n/help > Menù di aiuto!");
  if("botToken" in cookies) {
    $("#token").val(cookies["botToken"]);
  }
  M.textareaAutoResize($('#commands'));
  M.updateTextFields();
  $("#console").val("");
  $(".tooltipped").tooltip();
  updateCommands(false);
  $("#startBot").click(function() {
    botToken = $("#token").val();
    if(botToken != "" && botToken) {
      $("#startBot").addClass("disabled");
      log("Avviando il bot... Connessione in corso ai server telegram...");
      startUpdateAnalyzer();
    } else {
      log("Bot non avviato! Bot token vuoto!");
    }
  });
  $("#stopBot").click(function() {
    started = "stop";
    $("#stopBot").addClass("disabled");
    log("Richiesta di arresto inviata!");
  });
  $("#updateCommands").click(updateCommands);
});
function log(text) {
  $("#console").val($("#console").val() + text + "\n");
}
function updateCommands(doLog = true) {
  $(this).addClass("disabled");
  if(doLog) log("Aggiornamento lista comandi in corso...");
  commands = {};
  var commandsString = $("#commands").val();
  var c = commandsString.split("\n");
  for(var command in c) {
    var commandArr = c[command].split(" > ");
    commands[commandArr[0]] = commandArr[1];
  }
                setCookie("commands", $("#commands").val().split("\n").join("///////////"), 30);
  if(doLog) log("Aggiornamento lista comandi completato!");
  $(this).removeClass("disabled");
}
function startUpdateAnalyzer() {
  $.ajax({
    url: "https://api.telegram.org/bot" + botToken + "/getUpdates",
    async: true,
    method: "POST",
    data: {
      offset: updateOffset
    },
    dataType: "json",
    error: function(xhr) {
      var response = xhr.responseText;
      log("Errore nella connessione: "+response+"\nPossibile token errato.");
      $("#stopBot").addClass("disabled");
      $("#startBot").removeClass("disabled");
      clearInterval(updateAnalyzer);
    },
    success: function(response) {
      var update = {};
      if(response["result"] !== [] && response["result"] && response["result"].length > 0) {
        update = response["result"][0];
        updateOffset = update["update_id"];
        log("Analisi update #"+updateOffset);
        analyzeUpdate(update);
        updateOffset++;
      }
      if(started == 0) {
        setCookie("botToken", $("#token").val(), 30);
        log("Bot avviato! Attenzione: Se chiudi questa pagina, verrà anche arrestato il tuo bot!");
        $("#stopBot").removeClass("disabled");
        started = 1;
      }
      if(started == "stop") {
        $("#startBot").removeClass("disabled");
        log("Bot arrestato!");
        started = 0;
      } else startUpdateAnalyzer();
    }
  });
}
function analyzeUpdate(update) {
  var text = update["message"]["text"];
  var chat_id = update["message"]["chat"]["id"];
  if(text in commands) {
    $.ajax({
      url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
      async: true,
      method: "POST",
      data: {
        chat_id: chat_id,
        text: commands[text]
      },
      dataType: "json",
      error: function(xhr) {
        var response = xhr.responseText;
        log("Errore nell'invio del messaggio: "+response);
      },
    });
  }
}
function setCookie(name, value, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires=" + d.toGMTString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/tg-js-bot";
}

function getCookies() {
  var cookies = document.cookie;
  var splittedCookies = cookies.split(";");
  var cookiesArr = {};
  splittedCookies.forEach(function(cookie) {
    if(cookie.charAt(0) == " ") {
      cookie = cookie.substr(1);
    }
    var splittedValIndex = cookie.split("=");
    cookiesArr[splittedValIndex[0]] = splittedValIndex[1];
  });
  return cookiesArr;
}
