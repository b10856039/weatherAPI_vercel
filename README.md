# Side Project專案 臺灣氣象查詢 - 後端伺服器
此專案為透過Express.js獲取中央氣象局的氣象預報API資料，經資料預處理後再使用自製的API供前端網頁伺服器使用。
目前已在Vercel進行上線，可透過以下網址前往前端網頁進行使用。

[臺灣氣象查詢](https://tw-weather-info-show-page.vercel.app/ "link")


## 開發規格與環境說明

### 開發環境 
 * 作業系統 Window 10/11
 * 開發工具 Visual Studio Code 1.88.1 
 * 環境框架 Node.js 16.13.1
   
### 系統語言
 * Javascript ES6
   
### 系統套件
 *   express 4.19.2
 *   cookie-parser 1.4.4
 *   cors 2.8.5
 *   debug 2.6.9
 *   dotenv 16.4.5
 *   ejs 3.1.9 
 *   http-errors 1.6.3
 *   morgan 1.9.1
 *   node-fetch 2.7.0
   
### 雲端部署
 * 部署環境 Vercel

## 建置流程

1. 使用 git clone 或是 直接下載github的檔案。
2. 在有package.json的路徑使用template輸入並執行
   ``` XML
    npm install
   ```
   下載所需套件。
4. 找到.env檔案，將內部的config進行設定。
5. 在有index.js的路徑使用template輸入並執行
   ``` XML
      npm start
   ```
   即可啟動伺服器。

## Web API服務使用範例

### API 基本網址
API的請求都需使用以下的基本URL:
``` XML
  https://weather-api-rouge-eight.vercel.app/api/v1/
```
### 使用方式

1.一週氣象預報
1.1 縣市
* 端點 : "/WeatherWeek/cities/"
* 方法 : GET
* 參數 :
  * "cityName" : 城市名稱，例如:臺北市。
  * "weatherCode" : 天氣預報因子，預設為全部回傳。
     可過濾內容 : MinCI, MaxAT, MaxCI, MinT, UVI, MinAT, MaxT, WS, WD, Td, PoP12h, T, RH, Wx, WeatherDescription
  * "perType" : 預報類型，提供 "Week":一週 與 "3Hours" : 明後天3小時 之資料。

1.2 鄉鎮
* 端點 : "/WeatherWeek/towns/"
* 方法 : GET
* 參數 :
  * "cityName" : 城市名稱，例如:臺北市。
  * "townName" : 鄉鎮名稱，例如:中山區。
  * "weatherCode" : 天氣預報因子，預設為全部回傳。
     可過濾內容 : MinCI, MaxAT, MaxCI, MinT, UVI, MinAT, MaxT, WS, WD, Td, PoP12h, T, RH, Wx, WeatherDescription
  * "perType" : 預報類型，提供 "Week":一週 與 "3Hours" : 明後天3小時 之資料。
    
2.當下氣象情況
* 端點 : "/WeatherCurrent/"
* 方法 : GET
* 參數 :
  * "cityName" : 城市名稱，例如:臺北市。
  * "townName" : 鄉鎮名稱，例如:中山區。
  * "weatherCode" : 天氣預報因子，預設為全部回傳。
     可過濾內容 : MinCI, MaxAT, MaxCI, MinT, UVI, MinAT, MaxT, WS, WD, Td, PoP12h, T, RH, Wx, WeatherDescription
  * "queryType" : 獲取資料類型，提供 "CITY":僅縣市 與 "TOWN":所有鄉鎮。
    
* 範例連結 :
``` XML
  https://weather-api-rouge-eight.vercel.app/api/v1/weatherWeek/cities?cityName=%E8%87%BA%E4%B8%AD%E5%B8%82&perType=3Hours
```

