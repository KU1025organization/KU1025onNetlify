const properties = PropertiesService.getScriptProperties();
const githubClientId      = properties.getProperty('githubClientId');
const githubClientSecret  = properties.getProperty('githubClientSecret');
const githubAccessToken   = properties.getProperty('githubAccessToken');
const githubUserName      = properties.getProperty('githubUserName');
const githubRepository    = properties.getProperty('githubRepository');
const name                = properties.getProperty('name');
const email               = properties.getProperty('email');
const branchName          = properties.getProperty('branchName');

const siteUrl             = properties.getProperty('siteUrl');
const folderIdSpecial     = properties.getProperty('folderIdSpecial');
const folderIdGeneral     = properties.getProperty('folderIdGeneral');
const homePath = '';

const githubOption = { "name": name, "email": email };
let github = new GitHubAPI.GitHubAPI(githubUserName, githubRepository, githubAccessToken, githubOption);
let branch = github.getBranch(branchName);
let pTree = github.getTree(branch['commit']['commit']['tree']['sha']);
/**
 * 自動生成，日付と更新した科目を入力
 * @type {string}
 */
let commitMessage = "";
/**
 * 手動入力，自動更新でない場合に入力して実行することでコミットメッセージに追加される。基本は空文字列
 * @type {string}
 */
let commitMessage2 = "";

/**
 * index.htmlを更新
 */
function updateIndexPage(){
  commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + 'トップ' + commitMessage2;
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
  const result = github.updateReference(branchName, commit['sha']);
  Logger.log(result);
  return;
}

/**
 * upload.htmlを更新
 */
function updateUploadPage(){
  commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + 'アップロード' + commitMessage2;
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
  const result = github.updateReference(branchName, commit['sha']);
  Logger.log(result);
  return;
}

/**
 * 専門科目のpageを更新
 */
function updatePagesSpecial(){
  const rootFolderId = folderIdSpecial;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  makeDescendantPages(rootFolder, "index.html");

  if(commitMessage != ""){
    commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + '専門' + commitMessage2 + commitMessage;
    const data = {
      'tree': pTree['tree']
    };
    const tree = github.createTree(data);
    const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
    const result = github.updateReference(branchName, commit['sha']);
    Logger.log(result);
  }
  return;
}

/**
 * 全学共通科目のpageを更新
 */
function updatePagesGeneral(){
  const rootFolderId = folderIdGeneral;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  makeDescendantPages(rootFolder, "index.html");
  
  if(commitMessage != ""){
    commitMessage = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd") + '全学' + commitMessage2 + commitMessage;
    const data = {
      'tree': pTree['tree']
    };
    const tree = github.createTree(data);
    const commit = github.createCommit(commitMessage, tree['sha'], branch['commit']['sha']);
    const result = github.updateReference(branchName, commit['sha']);
    Logger.log(result);
  }
  return;
}

/**
 * folder以下のすべてのフォルダについて，再帰的にupdatePage()を実行
 * 
 * @param {Object} folder [DriveApp folder class]
 * @param {string} parentPage [folderの1つ上のフォルダに該当するページのurl ex:index.html]
 */
function makeDescendantPages(folder, parentPage){
  const page = updatePage(folder, parentPage);
  const childFolders = folder.getFolders();
  while(childFolders.hasNext()){
    const childFolder = childFolders.next();
    makeDescendantPages(childFolder, page);
  }
  return;
}

/**
 * folder以下のすべてのフォルダについて，再帰的にupdatePage()を実行
 * 
 * @param {Object} folder [DriveApp folder class]
 * @param {string} parentPage [folderの1つ上のフォルダに該当するページのurl ex:index.html]
 * @return {string} [folderに該当するページのurl ex:folder.html]
 */
function updatePage(folder, parentPage){
  const folderName = folder.getName();
  const page = folderName.replace(/[\(\)]/g,"") + '.html';
  
  const myData = getFilesIdIn(folder);
  const now = new Date().getTime();
  
  if(now - myData["updated"] < 25*60*60*1000){  //25時間以内ならページ更新
    const contents = makeContents(folder, myData);
    
    let htmlTemplate = HtmlService.createTemplateFromFile('pages');
    htmlTemplate.pageUrl     = page;
    htmlTemplate.parentUrl   = parentPage;
    htmlTemplate.parentTitle = parentPage.substr(0,parentPage.length-5);
    htmlTemplate.content     = contents;
    htmlTemplate.title       = folderName;
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

/**
 * フォルダ，ファイル一覧のhtmlを生成
 * 
 * @param {Object} rootFolder [DriveApp folder class 一覧を生成したいフォルダ]
 * @param {Object} myData [{folder: Array<{name: string,fileId: string}>, file: Array<{name: string,fileId: string}>, updated: number} rootFolder内のフォルダとファイルに関するデータ]
 * 
 * @return {string} [<li>タグによる各フォルダ，ファイルのリスト]
 */
function makeContents(rootFolder, myData){
  let contents = "";
  
  const rootFolderName = rootFolder.getName().replace(/[\(\)]/g,"");
  const pageUrl = siteUrl + rootFolderName + '.html';  //現在表示しているページのurl
  
  //tweetbottunUrl1,2の間にファイル名を入れてtweetボタンのテキストに
  const tweetbottunUrl1 = "https://twitter.com/intent/tweet?hashtags=KU1025,"
                      + rootFolderName
                      + "&ref_src=twsrc%5Etfw&text=KU1025で";
  const tweetbottunUrl2 = "を解いたよ&url=" + encodeURI(encodeURI(pageUrl)) + "&tw_p=tweetbutton&ref_src=twsrc%5Etfw";
  //encodeURI(encodeURI())ではなくencodeURIComponent()がただしいのでは？
  
  for(let i in myData["folder"]){
    
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

/**
 * targetFolder内のfile,folderの情報を取得
 * 
 * @param {Object} targetFolder [DriveApp folder class 一覧を生成したいフォルダ]
 * 
 * @return {Object} myData [{folder: Array<{name: string,fileId: string}>, file: Array<{name: string,fileId: string}>, updated: number} targetFolder内のフォルダとファイルに関するデータ]
 */
function getFilesIdIn(targetFolder){
  let result = {folder: [], file: [], updated: targetFolder.getLastUpdated().getTime()};
  
  //targetFolder直下の全fileのnameとidを取得
  const files = targetFolder.getFiles();
  while(files.hasNext()){
    const file = files.next();
    result["file"].push({name: file.getName(),fileId: file.getId()});
    result["updated"] = (result["updated"] > file.getLastUpdated().getTime())? result["updated"] : file.getLastUpdated().getTime();
  }
  
  //targetFolder直下の全folderのnameとidを取得
  const childFolders = targetFolder.getFolders();
  while(childFolders.hasNext()){
    const childFolder = childFolders.next();
    result["folder"].push({name: childFolder.getName(), fileId: childFolder.getId()});
    result["updated"] = (result["updated"] > childFolder.getLastUpdated().getTime())? result["updated"] : childFolder.getLastUpdated().getTime();
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

/**
 * htmlにhtmlを入れるための関数
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
//css.htmlをindex.htmlやpages.htmlにincludeするための関数
//参考：https://tonari-it.com/gas-html-css/#toc4