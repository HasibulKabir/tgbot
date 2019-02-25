"use strict";


var botToken = "";
var updateOffset = -1;
var updateAnalyzer;
var cookies = localStorage;
var commands = {};
var started = 0;
$(document).ready(function() {
  if("commands" in cookies) {
    $("#commands").val(cookies["commands"].split("///////////").join("\n"));
  } else $("#commands").val("/start > Messaggio di avvio!;\n/help > Menù di aiuto!;");
  if("botToken" in cookies) {
    $("#token").val(cookies["botToken"]);
  }
  if("botSettings" in cookies) {
    var bSettings = JSON.parse(cookies["botSettings"]);
    if ("parseMode" in bSettings)
      $("#parseMode").val(bSettings["parseMode"]);
    if ("wpPreview" in bSettings)
      $("#wpPreview").val(bSettings["wpPreview"]);
  }
  M.textareaAutoResize($('#commands'));
  M.updateTextFields();
  $("#console").val("");
  $(".tooltipped").tooltip();
  $('select').formSelect();
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
  var consoleElem = $("#console");
  consoleElem.val(consoleElem.val() + text + "\n");
  consoleElem.scrollTop(consoleElem.height());
}
function updateCommands(doLog = true) {
  $(this).addClass("disabled");
  if(doLog) log("Aggiornamento lista comandi in corso...");
  commands = {};
  var commandsString = $("#commands").val();
  var c = commandsString.split(/;$/gm);
  for(var command in c) {
    if(c[command].charAt(0) === "\n") c[command] = c[command].substr(1);
    var commandArr = c[command].split(" > ");
    commands[commandArr[0]] = commandArr[1];
  }
  localStorage.setItem("commands", $("#commands").val().replace(/\n/g, "///////////"));
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
      started = 0;
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
        localStorage.setItem("botToken", $("#token").val());
        localStorage.setItem("botSettings", JSON.stringify({
          parseMode: $("#parseMode").val(),
          wpPreview: $("#wpPreview").val()
        }));
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
        text: commands[text],
        parse_mode: $("#parseMode").val(),
        disable_web_page_preview: $("wpPreview").val()
      },
      dataType: "json",
      error: function(xhr) {
        var response = xhr.responseText;
        log("Errore nell'invio del messaggio: "+response);
      },
    });
  }
}
