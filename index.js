function getWikipediaEntitiesAsArray (response) {
  var entityResultList = []
  var entities = response.entities;
  entities.forEach(entity => {
      if (entity.metadata && entity.metadata.wikipedia_url) {
          entityResult = entity.name.toLowerCase()
          entityResultList.push(entityResult)
      } 
  });
  return entityResultList
}

function retrieveEntities (line) {
  var apiKey = "YOUR API KEY HERE";
  var apiEndpoint = 'https://language.googleapis.com/v1beta2/documents:analyzeEntities?key=' + apiKey;
  var nlData = {
  "document": {
    "language": "de-de",
    "type": "PLAIN_TEXT",
    "content": line
  },
  "encodingType": "UTF8" };
  var nlOptions = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(nlData),
    "muteHttpExceptions": true
  };
  var response = UrlFetchApp.fetch(apiEndpoint, nlOptions);
  entityResultList = getWikipediaEntitiesAsArray(JSON.parse(response))
  entityResultList = entityResultList.sort()
  return entityResultList;
};

function scrapeTitleDescription(url) {
  var html = UrlFetchApp.fetch(url).getContentText();
  var $ = Cheerio.load(html);
  var title = $('title').first().text()
  var desc = $('meta[name=description]').attr('content')
  return title + ". " + desc
}

function mySleep(sec) {
  SpreadsheetApp.flush();
  Utilities.sleep(sec*1000);
  SpreadsheetApp.flush();
}

function start () {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  //Clean NLP Results Sheet
  var sheetNLPResult = ss.getSheetByName("NLP Results");
  sheetNLPResult.clear()
  sheetNLPResult.getRange(1, 1).setValue("URL")
  sheetNLPResult.getRange(1, 2).setValue("Entity")
  sheetNLPResult.getRange(1, 3).setValue("Clicks")
  sheetNLPResult.getRange(1, 4).setValue("Impressions")
  sheetNLPResult.getRange(1, 5).setValue("CTR")

  //Discover Sheet 
  var sheetDiscover = ss.getSheetByName("Discover");
  var valuesDiscover = sheetDiscover.getRange("A:D").getValues()
  sheetDiscover.getRange(1, 5).setValue("Title + Desc")
  sheetDiscover.getRange(1, 6).setValue("Entities")

  //Loop discover to get click, impressions, ctr
  for (var k = 0; k < valuesDiscover.length; k++) {
    try {
      mySleep(0.2)
      Logger.log(valuesDiscover[k][0]) //Log URL

      titleAndDesc = scrapeTitleDescription(valuesDiscover[k][0]) //Get title + desc from crawl 
      sheetDiscover.getRange(k+1, 5).setValue(titleAndDesc) 

      var clicks = valuesDiscover[k][1]
      var impressions = valuesDiscover[k][2]

      if(titleAndDesc != "") {
        entityResultList = retrieveEntities(titleAndDesc) //Get entities

        if(entityResultList.length !== 0) {
          clicks = clicks / entityResultList.length
          impressions = impressions / entityResultList.length

          var entityResultListString = entityResultList.sort().join(" | ")
          sheetDiscover.getRange(k+1, 6).setValue(entityResultListString) //Add pipe seperated entities in Discover sheet 

          var last = sheetNLPResult.getDataRange().getValues().length; //last row with data

          //NLP Results Sheet with single entities
          for (var j = 0; j < entityResultList.length; j++) { 
            sheetNLPResult.getRange(last+j+1, 1).setValue(valuesDiscover[k][0])
            sheetNLPResult.getRange(last+j+1, 2).setValue(entityResultList[j])
            sheetNLPResult.getRange(last+j+1, 3).setValue(clicks)
            sheetNLPResult.getRange(last+j+1, 4).setValue(impressions)
          }
        } 
      } 
    } catch (e) {
      Logger.log(e)
    }
  }
}
