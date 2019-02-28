"use strict";


var botToken = "";
var updateOffset = -1;
var updateAnalyzer;
var cookies = localStorage;
var commands = {};
var started = 0;
var selectedChatId = 0;
var lastCommand = "";
function log(text, prefix = "[INFO]", classes = "white-text") {
  var consoleElem = $("#console");
  consoleElem.html(consoleElem.html() + "<span class=\""+classes+"\">" + prefix + " " + text + "</span><br />");
  consoleElem.scrollTop(consoleElem[0].scrollHeight - consoleElem.height());
}
$(document).ready(function() {
  $("#autoStart").on("change", updateBotSettings);
  $("#logAllMsg").on("change", updateBotSettings);
  $("#parseMode").on("change", updateBotSettings);
  $("#wpPreview").on("change", updateBotSettings);
  $("#ufUpdAnalyzer").on("change", updateBotSettings);
  $("#consoleCommandsGo").click(function() {
    var commandI = $("#consoleCommands");
    var command = commandI.val().replace(/\\n/g, "\n")
    lastCommand = commandI.val();
    if(botToken != "" && botToken && started == 1)
      switch(commandI.val().split(" ",1)[0]) {
        case "/help":
          log("Menù comandi:<br />/help: visualizza questo menù di aiuto<br />/select &lt;chat_id&gt;: seleziona chat in cui inviare i messaggi<br />&lt;messaggio&gt;: invia messaggio nella chat_id selezionata", "");
          break;
        case "/select":
          var cId = commandI.val().split(" ");
          if (1 in cId) {
            selectedChatId = cId[1];
            log("Selezionato "+selectedChatId+"!", "[INFO]", "green-text");
            updateBotSettings();
          } else {
            if(selectedChatId) {
              selectedChatId = 0;
              log("Rimossa selezione chat_id.");
              updateBotSettings();
            } else
              log("Metti la chat_id dopo /select, se non conosci il chat_id, dai al bot /chatid", "[ERRORE]", "red-text");
          }
          break;
        default:
          if(commandI.val().charAt(0) == "/")
            log("Comando non valido. /help per una lista completa di comandi.", "[ERRORE]", "red-text");
          else {
            if (selectedChatId != 0) {
              if(command.replace(new RegExp(" ", "g"), "").length > 0)
                if(command.length <= 4096)
                  sendMessage(selectedChatId, command, true);
                else
                  log("Messaggio troppo lungo. Caratteri massimi consentiti: 4096 caratteri.", "[ERRORE]", "red-text");
              else
                log("Messaggio nullo.", "[ERRORE]", "red-text");
            } else
              log("Per favore, prima di tentare di inviare un messaggio, usa /select", "[ERRORE]", "red-text");
          }
          break;
      } else {
        log("Prima di scrivere comandi, perfavore, metti il token del bot. Se lo hai già fatto, assicurati di aver avviato il bot cliccando il pulsante \"Avvia\"", "[ERRORE]", "red-text");
      }
    commandI.val("");
  });
  $("#consoleCommands").focus(function() {
    $("#consoleCommandsContainer").css("background", "rgb(15, 15, 15)");
  });
  $("#consoleCommands").blur(function() {
    $("#consoleCommandsContainer").css("background", "#000");
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
      $("#startBot").prop("disabled", true);
      log("Avviando il bot... Connessione in corso ai server telegram...", "[INFO]", "blue-text");
      setTimeout(startUpdateAnalyzer, 0);
    } else {
      log("Bot non avviato! Bot token vuoto!", "[ERRORE]", "red-text");
    }
  });
  $("#stopBot").click(function() {
    started = "stop";
    $("#stopBot").prop("disabled", true);
    log("Richiesta di arresto inviata!", "[INFO]", "yellow-text");
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
          log("Bot in avvio secondo le tue impostazioni...", "[INFO]", "yellow-text");
          if (botToken != "" && botToken) {
            $("#startBot").click();
          } else {
            log("Bot token vuoto.", "[ERRORE]", "red-text");
            $("#autoStart").prop("checked", false);
            updateBotSettings();
          }
        }, 0);
      }
    }
    if ("selectedChatId" in bSettings && bSettings["selectedChatId"] != 0) {
      selectedChatId = bSettings["selectedChatId"];
      setTimeout(function() {
        log("Selezionata chat_id "+selectedChatId+" come da sessione precedente.", "[INFO]", "yellow-text");
      }, 0)
    }
    if ("logAllMsg" in bSettings)
      $("#logAllMsg").prop("checked", bSettings["logAllMsg"]);
    if ("ufUpdAnalyzer" in bSettings)
      $("#ufUpdAnalyzer").prop("checked", bSettings["ufUpdAnalyzer"]);
  }
  M.textareaAutoResize($('#commands'));
  M.updateTextFields();
  $("#console").html("");
  $(".tooltipped").tooltip();
  $('select').formSelect();
  updateCommands(false);
  setTimeout(function() {
    $("#loader").css("display", "none");
    $("#content").fadeIn();
  }, 0);
});
function updateCommands(doLog = true) {
  $("#updateCommands").prop("disabled", true);
  if(doLog) log("Aggiornamento lista comandi in corso...", "[INFO]", "yellow-text");
  commands = {};
  var commandsString = $("#commands").val();
  var c = commandsString.split(/;$/gm);
  for(var command in c) {
    if(c[command].charAt(0) === "\n") c[command] = c[command].substr(1);
    var commandArr = c[command].split(" > ");
    commands[commandArr[0]] = commandArr[1];
  }
  localStorage.setItem("commands", $("#commands").val().replace(/\n/g, "///////////"));
  if(doLog) log("Aggiornamento lista comandi completato!", "[INFO]", "green-text");
  $("#updateCommands").prop("disabled", false);
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
      log("Errore nella connessione: "+response+"<br />Possibile token errato.", "[ERRORE]", "red-text");
      $("#stopBot").prop("disabled", true);
      $("#startBot").prop("disabled", false);
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
        log("Bot avviato! Attenzione: Se chiudi questa pagina, verrà anche arrestato il tuo bot!", "[INFO]", "blue-text");
        log("/help per i comandi della console.");
        $("#stopBot").prop("disabled", false);
        started = 1;
      }
      if(started == "stop") {
        $("#startBot").prop("disabled", false);
        log("Bot arrestato!", "[INFO]", "blue-text");
        started = 0;
      } else setTimeout(startUpdateAnalyzer, ($("#ufUpdAnalyzer").prop("checked")) ? 0 : 500);
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
      ufUpdAnalyzer: $("#ufUpdAnalyzer").prop("checked"),
      selectedChatId: selectedChatId,
    }));
}
function analyzeUpdate(update) {
  var text = "";
  var message;
  var chat_id = 0
  var name = "";
  if ("message" in update)
    message = update["message"];
  else
    message = {};
  if ("chat" in message)
    chat_id = update["message"]["chat"]["id"];
  else {
    log("Messaggio non supportato", "[WARNING]", "yellow-text");
    return false;
  }
  if ("text" in message)
    text = message["text"];
  else
    text = "Messaggio non supportato.";
  if("from" in message) {
    if ("first_name" in message["from"])
      name = message["from"]["first_name"];
    if("last_name" in message["from"])
      name += message["from"]["last_name"];
  }
  if(selectedChatId == chat_id || $("#logAllMsg").prop("checked")) {
    log(text, "["+((selectedChatId == chat_id) ? "SELECTED " : "")+chat_id+": "+name+"]", ((selectedChatId == chat_id) ? "yellow-text" : "white-text"))
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
        if(doLog) log(response.result.text, "[Messaggio inviato: "+chat_id+"]", "green-text");
      },
      error: function(xhr) {
        var response = xhr.responseText;
        log("Errore nell'invio del messaggio: "+response, "[ERRORE]", "red-text");
      },
    });
    return true;
  }
}
