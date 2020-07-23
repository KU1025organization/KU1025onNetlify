const properties = PropertiesService.getScriptProperties();
const githubClientId     = properties.getProperty('githubClientId');
const githubClientSecret = properties.getProperty('githubClientSecret');
const githubAccessToken = properties.getProperty('githubAccessToken');
const githubUserName = properties.getProperty('githubUserName');
const githubRepository = properties.getProperty('githubRepository');
const name = properties.getProperty('name');
const email = properties.getProperty('email');

const siteUrl = properties.getProperty('siteUrl');
const folderIdSpecial = properties.getProperty('folderIdSpecial');
const folderIdGeneral = properties.getProperty('folderIdGeneral');
const homePath = '';

const githubOption = { "name": name, "email": email };
let github = new GitHubAPI.GitHubAPI(githubUserName, githubRepository, githubAccessToken, githubOption);
let branch = github.getBranch("Netlify");
let pTree = github.getTree(branch['commit']['commit']['tree']['sha']);
let commitMessage = "";

//index.htmlを更新
function updateIndexPage(){
  commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + 'トップ' + commitMessage;
  let htmlTemplate = HtmlService.createTemplateFromFile('index');
  const html = htmlTemplate.evaluate().getContent();
  const blob = github.createBlob(html);
  const data = {
    'tree': pTree['tree'].concat([
      {
      'path': 'index.html',
      'mode': '100644',
      'type': 'blob',
      'sha': blob['sha']
      }
    ])
  };
  const tree = github.createTree(data);
  const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
  const result = github.updateReference("Netlify", commit['sha']);
  Logger.log(result);
  return 0;
}

//upload.htmlを更新
function updateUploadPage(){
  commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + 'アップロード' + commitMessage;
  let htmlTemplate = HtmlService.createTemplateFromFile('upload');
  const html = htmlTemplate.evaluate().getContent();
  const blob = github.createBlob(html);
  const data = {
    'tree': pTree['tree'].concat([
      {
      'path': 'upload.html',
      'mode': '100644',
      'type': 'blob',
      'sha': blob['sha']
      }
    ])
  };
  const tree = github.createTree(data);
  const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
  const result = github.updateReference("Netlify", commit['sha']);
  Logger.log(result);
  return 0;
}

//専門科目のpageを更新
function updatePagesSpecial(){
  const rootFolderId = folderIdSpecial;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  makeDescendantPages(rootFolder, "index.html");

  if(commitMessage != ""){
    commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + '専門' + commitMessage;
    const data = {
      'tree': pTree['tree']
    };
    const tree = github.createTree(data);
    const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
    const result = github.updateReference("Netlify", commit['sha']);
    Logger.log(result);
  }
  return 0;
}

//全学共通科目のpageを更新
function updatePagesGeneral(){
  const rootFolderId = folderIdGeneral;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  makeDescendantPages(rootFolder, "index.html");
  
  if(commitMessage != ""){
    commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + '全学' + commitMessage;
    const data = {
      'tree': pTree['tree']
    };
    const tree = github.createTree(data);
    const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
    const result = github.updateReference("Netlify", commit['sha']);
    Logger.log(result);
  }
  return 0;
}

//folder以下のすべてのフォルダについて，再帰的にupdatePage()を実行
function makeDescendantPages(folder, parentPage){
  const page = updatePage(folder, parentPage);
  const childFolders = folder.getFolders();
  while(childFolders.hasNext()){
    const childFolder = childFolders.next();
    makeDescendantPages(childFolder, page);
  }
  return 0;
}


////////////////////////////////////////////////////////////////////////////////////////////
function updatePage(folder, parentPage){
  const folderName = folder.getName();
  const page = folderName.replace(/\(/g,"").replace(/\)/g,"") + '.html';
  
  const myData = getFilesIdIn(folder);
  const now = new Date().getTime();
  
  if(now - myData["updated"] < 365*24*60*60*1000){  //25時間以内ならページ更新
    const contents = makeContents(folder, myData);
    
    let htmlTemplate = HtmlService.createTemplateFromFile('pages');
    htmlTemplate.parentUrl   = parentPage;
    htmlTemplate.parentTitle = parentPage.substr(0,parentPage.length-5);
    htmlTemplate.content = contents;
    htmlTemplate.title = folderName;
    const html = htmlTemplate.evaluate().getContent();
    
    const blob = github.createBlob(html);
    pTree['tree'] = pTree['tree'].concat([
      {
      'path': homePath + page,
      'mode': '100644',
      'type': 'blob',
      'sha': blob['sha']
      }]);
    commitMessage += ',' + folderName;
  }
  return page;
}

//フォルダ，ファイル一覧のhtmlを生成
function makeContents(rootFolder, myData){
  let contents = "";
  
  const rootFolderName = rootFolder.getName().replace(/\(/g,"").replace(/\)/g,"");
  const pageUrl = siteUrl + rootFolderName + '.html';  //現在表示しているページのurl
  
  //tweetbottunUrl1,2の間にファイル名を入れてtweetボタンのテキストに
  const tweetbottunUrl1 = "https://twitter.com/intent/tweet?hashtags=KU1025,"
                      + rootFolderName
                      + "&ref_src=twsrc%5Etfw&text=KU1025で";
  const tweetbottunUrl2 = "を解いたよ&url=" + encodeURI(encodeURI(pageUrl)) + "&tw_p=tweetbutton&ref_src=twsrc%5Etfw";
  
  for(let i=0; myData["folder"][i] != undefined; i++){
    
    let folderId = JSON.stringify(myData["folder"][i]["fileId"]);
    let folderName = JSON.stringify(myData["folder"][i]["name"]);
    folderId   = folderId.substr(1,folderId.length-2);     //.substr(1,folderId.length-2)で””を取り除く
    folderName = folderName.substr(1,folderName.length-2);
    //<li><a href="https://script.google.com/macros/s/[scriptId]/dev?id=[folderId]">[folderName]</a></li>
    contents += "<li><a href=\"" + siteUrl + folderName.replace(/\(/g,"").replace(/\)/g,"") + ".html\">" + folderName + "</a></li>";
  }
  for(let i=0; myData["file"][i] != undefined; i++){
    
    let fileId = JSON.stringify(myData["file"][i]["fileId"]);
    let fileName = JSON.stringify(myData["file"][i]["name"]);
    fileId = fileId.substr(1,fileId.length-2);
    fileName = fileName.substr(1,fileName.length-2);
    //<li><a href="https://drive.google.com/file/d/[fileId]" target="_blank">[fileName]</a>
    //<a href="[tweetbottunUrl]" class="tweetbottun">&nbsp;ツイート&nbsp;</a></li>
    contents += "<li><a href=\"https://drive.google.com/file/d/" + fileId + "\" target=\"_blank\">" + fileName + "</a> " //ファイルへのリンク
              + "<a href=\"" + tweetbottunUrl1 + fileName.replace(/\..*/g,"") + tweetbottunUrl2 + "\" class=\"twitter-hashtag-button\">Tweet</a></li>"; //tweetボタン
  }
  return contents;
}

//targetFolder内のfile,folderの情報を取得
function getFilesIdIn(targetFolder){
  var result = {folder: [], file: [], updated: targetFolder.getLastUpdated().getTime()};
  
  //targetFolder直下の全fileのnameとidを取得
  var files = targetFolder.getFiles();
  while(files.hasNext()){
    var file = files.next();
    result["file"].push({name: file.getName(),fileId: file.getId()});
    result["updated"] = (result["updated"] > file.getLastUpdated().getTime())? result["updated"] : file.getLastUpdated().getTime();
  }
  
  //targetFolder直下の全folderのnameとidを取得
  var child_folders = targetFolder.getFolders();
  while(child_folders.hasNext()){
    var child_folder = child_folders.next();
    result["folder"].push({name: child_folder.getName(), fileId: child_folder.getId()});
    result["updated"] = (result["updated"] > child_folder.getLastUpdated().getTime())? result["updated"] : child_folder.getLastUpdated().getTime();
  }
  
  result["file"].sort(function(a,b){ //filename降順でソート
    if(a.name < b.name) return 1;
    else return -1;
  });
  result["folder"].sort(function(a,b){ //foldername昇順でソート
    if(a.name < b.name) return -1;
    else return 1;
  });
  return result;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
//css.htmlをindex.htmlやpages.htmlにincludeするための関数
//参考：https://tonari-it.com/gas-html-css/#toc4
