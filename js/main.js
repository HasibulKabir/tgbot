"use strict";


var botToken = "";
var updateOffset = -1;
var updateAnalyzer;
var cookies = localStorage;
var commands = {};
var started = 0;
var selectedChatId = 0;
var lastCommand = "";
function log(text, prefix = "[INFO]") {
  var consoleElem = $("#console");
  consoleElem.val(consoleElem.val() + prefix + " " + text + "\n");
  consoleElem.scrollTop(consoleElem[0].scrollHeight - consoleElem.height());
}
$(document).ready(function() {
  $("#autoStart").on("change", updateBotSettings);
  $("#logAllMsg").on("change", updateBotSettings);
  $("#parseMode").on("change", updateBotSettings);
  $("#wpPreview").on("change", updateBotSettings);
  $("#consoleCommandsGo").click(function() {
    var commandI = $("#consoleCommands");
    var command = commandI.val().replace(/\\n/g, "\n")
    lastCommand = commandI.val();
    switch(commandI.val().split(" ",1)[0]) {
      case "/help":
        log("Menù comandi:\n/help: visualizza questo menù di aiuto\n/select <chat_id>: seleziona chat in cui inviare i messaggi\n<messaggio>: invia messaggio nella chat_id selezionata", "");
        break;
      case "/select":
        var cId = commandI.val().split(" ");
        if (1 in cId) {
          selectedChatId = cId[1];
          log("Selezionato "+selectedChatId+"!");
          updateBotSettings();
        } else {
          if(selectedChatId) {
            selectedChatId = 0;
            log("Rimossa selezione chat_id.")
          } else
            log("Metti la chat_id dopo /select, se non conosci il chat_id, dai al bot /chatid", "[ERRORE]");
        }
        break;
      default:
        if(commandI.val().charAt(0) == "/")
          log("Comando non valido.", "[ERRORE]");
        else {
          if (selectedChatId != 0) {
            if(command.length <= 4096)
              sendMessage(selectedChatId, command, true);
            else
              log("Messaggio troppo lungo. Caratteri massimi consentiti: 4096 caratteri.", "[ERRORE]");
          } else
            log("Per favore, prima di tentare di inviare un messaggio, usa /select", "[ERRORE]");
        }
        break;
    }
    commandI.val("");
  });
  $("#consoleCommands").keyup(function(e) {
    if(e.keyCode == 13) {
      $("#consoleCommandsGo").click();
    } else if(e.keyCode == 38) {
      $(this).val(lastCommand);
    }
  });
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
  $("#commands").blur(function() {
    updateCommands(true);
  });
  $("#updateCommands").click(updateCommands);
  if("commands" in cookies) {
    $("#commands").val(cookies["commands"].split("///////////").join("\n"));
  } else $("#commands").val("/start > Messaggio di avvio!;\n/help > Menù di aiuto!;");
  if("botToken" in cookies) {
    $("#token").val(cookies["botToken"]);
    botToken = $("#token").val();
  }
  if("botSettings" in cookies) {
    var bSettings = JSON.parse(cookies["botSettings"]);
    if ("parseMode" in bSettings)
      $("#parseMode").val(bSettings["parseMode"]);
    if ("wpPreview" in bSettings)
      $("#wpPreview").val(bSettings["wpPreview"]);
    if ("autoStart" in bSettings) {
      $("#autoStart").prop("checked", bSettings["autoStart"]);
      if(bSettings["autoStart"] == true) {
        setTimeout(function() {
          log("Bot in avvio secondo le tue impostazioni...");
          if (botToken != "" && botToken) {
            $("#startBot").click();
          } else {
            log("Bot token vuoto.");
            $("#autoStart").prop("checked", false);
            updateBotSettings();
          }
        }, 3000);
      }
    }
    if ("selectedChatId" in bSettings && bSettings["selectedChatId"] != 0) {
      selectedChatId = bSettings["selectedChatId"];
      setTimeout(function() {
        log("Selezionata chat_id "+selectedChatId+" come da sessione precedente.");
      }, 1000)
    }
    if ("logAllMsg" in bSettings)
      $("#logAllMsg").prop("checked", bSettings["logAllMsg"]);
  }
  M.textareaAutoResize($('#commands'));
  M.updateTextFields();
  $("#console").val("");
  $(".tooltipped").tooltip();
  $('select').formSelect();
  $('input#consoleCommands').characterCounter();
  updateCommands(false);
});
function updateCommands(doLog = true) {
  $("#updateCommands").addClass("disabled");
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
  $("#updateCommands").removeClass("disabled");
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
      log("Errore nella connessione: "+response+"\nPossibile token errato.", "[ERRORE]");
      $("#stopBot").addClass("disabled");
      $("#startBot").removeClass("disabled");
      started = 0;
    },
    success: function(response) {
      var update = {};
      if(response["result"] !== [] && response["result"] && response["result"].length > 0) {
        update = response["result"][0];
        updateOffset = update["update_id"];
        analyzeUpdate(update);
        updateOffset++;
      }
      if(started == 0) {
        localStorage.setItem("botToken", $("#token").val());
        log("Bot avviato! Attenzione: Se chiudi questa pagina, verrà anche arrestato il tuo bot!");
        $("#stopBot").removeClass("disabled");
        started = 1;
      }
      if(started == "stop") {
        $("#startBot").removeClass("disabled");
        log("Bot arrestato!");
        started = 0;
      } else setTimeout(startUpdateAnalyzer, 500);
    }
  });
}
function updateBotSettings() {
  if (botToken != "" && botToken)
    localStorage.setItem("botSettings", JSON.stringify({
      parseMode: $("#parseMode").val(),
      wpPreview: $("#wpPreview").val(),
      autoStart: $("#autoStart").prop("checked"),
      logAllMsg: $("#logAllMsg").prop("checked"),
      selectedChatId: selectedChatId
    }));
}
function analyzeUpdate(update) {
  var text = update["message"]["text"];
  var chat_id = update["message"]["chat"]["id"];
  if(selectedChatId == chat_id || $("#logAllMsg").prop("checked")) {
    log(text, "["+((selectedChatId == chat_id) ? "SELECTED " : "")+chat_id+": "+update.message.from.first_name+(update.message.from.last_name ? " "+update.message.from.last_name : "")+"]")
  }
  if(text == "/chatid") {
    sendMessage(chat_id, "ID del gruppo: <code>"+chat_id+"</code>", false, "HTML");
  }
  if(text in commands) {
    sendMessage(chat_id, commands[text]);
  }
}
function sendMessage(chat_id, messageText, doLog = false, parse_mode = false) {
  if(!parse_mode) parse_mode = $("#parseMode").val();
  if((chat_id == undefined || chat_id == "") && !chat_id) {
    return false;
  } else {
    $.ajax({
      url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
      async: true,
      method: "POST",
      data: {
        chat_id: chat_id,
        text: messageText,
        parse_mode: parse_mode,
        disable_web_page_preview: $("wpPreview").val()
      },
      dataType: "json",
      success: function(response) {
        if(doLog) log(response.result.text, "[Messaggio inviato: "+chat_id+"]");
      },
      error: function(xhr) {
        var response = xhr.responseText;
        log("Errore nell'invio del messaggio: "+response, "[ERRORE]");
      },
    });
    return true;
  }
}
