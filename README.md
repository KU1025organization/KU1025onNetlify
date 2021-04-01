# KU1025onNetlify
  ## とは
   [KU1025](https://ku1025.netlify.app/)とは京都大学工学部物理工学科の過去問サイトです。
   管理者がGoogleドライブにアップロードした過去問のpdfを、そのフォルダ構造を反映したwebページ化したものです。
   
   webページのホスティングは[Netlify](https://netlify.app/)を利用しています。
   [github](https://github.com/)の特定のリポジトリにcommitがあると自動でページを更新してくれる機能があり、[Google Apps Script](https://www.google.com/script/start/)を使って生成したHTMLを自動でcommitすることで更新を自動化しています。

  ## 使い方
   ### github API(OAuth App)のverification
   1. https://docs.github.com/en/developers/apps/creating-an-oauth-app を参考にgithubのOAuth appを作る。(https://github.com/settings/applications/newにアクセスしても同じことができる)

      - Authorization callback URLは、GASのプロジェクトをデプロイし、そのウェブアプリURLを指定

      - Client secretは1回しか見れないので、この時に絶対メモする。忘れたら再発行

      - Client IDもメモる

      - 作った後は、Settings/Developer settings/application名 で設定が見れる 

   1. https://github.com/login/oauth/authorize?client_id=$CLIENT_ID&scope=repo にアクセスするとcallback URLにリダイレクトされるので、codeパラメータをメモする。

   1. 次のコードを実行し、返ってくるaccess_tokenをメモする
      ```
        $ curl -X POST \
          -d "code=$CODE" \
          -d "client_id=$CLIENT_ID" \
          -d "client_secret=$CLIENT_SECRET" \
          https://github.com/login/oauth/access_token
      ```
      #### 参考
        - https://docs.github.com/en/developers/apps/building-oauth-apps
        - https://matsubara0507.github.io/posts/2017-05-03-make-githubapi-lib-for-gas.html
        - https://qiita.com/ngs/items/34e51186a485c705ffdb


   ### script properties の設定
   1. 以下の内容でGASのscript propertiesを設定する。
  
      |key|value|
      | ---- | ---- |
      |githubClientId|Client ID|
      |githubClientSecret|Client secret|
      |githubAccessToken|access_token|
      |githubUserName|過去問サイトのhtmlを管理するリポジトリのowner|
      |githubRepository|過去問サイトのhtmlを管理するリポジトリ名|
      |name|name(create commitするときに使われる)|
      |email|email(create commitするときに使われる)|
      |branchName|過去問サイトのhtmlを管理するリポジトリのブランチ名|
      |siteUrl|過去問サイトのURL|
      |folderIdSpecial|専門科目が入っているGoogleドライブのフォルダid|
      |folderIdGeneral|全学共通科目が入っているGoogleドライブのフォルダid|

   ### Netlifyの設定
   1. https://app.netlify.com でページを作成し、deploy settings でgithubのhtmlを管理するリポジトリに紐づける。



  ## 仕組み
  coming soon...
