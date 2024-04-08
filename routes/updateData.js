const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');

//測試用
// const cron = require('cron');

//氣象資料獲取
class WeatherDataFetcher {
  constructor(authorizationId) {
    this.authorizationId = authorizationId;
  }

  //刪除舊資料
  async deleteOldData(savePath){
    try{
      fs.access(savePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error('文件不存在or無法訪問');
        } else {          
          fs.unlink(savePath, (err) => {
            if (err) {
              console.error('刪除文件產生錯誤', err);
            } else {
              console.log('文件成功刪除');
            }
          });
        }
      });      
    }catch(err){
      console.log(err)
    }
  }

  //執行Fetch功能，獲取API資料
  async fetchData(targetUrl, callType,savePath) {
    try {
  
      await this.deleteOldData(savePath)
      
      const cityWeatherId = 'F-D0047-';
      let queryType = ''
      let arr = []
      if(callType !== 'none'){
        queryType = (callType === 'town') ? 'locationId=' : 'locationName=';
        arr = (callType === 'town') ? this.generatorCitiesID(cityWeatherId, []) : this.generatorCitiesName();
      }
      
      let fetchPromises = null;
      if(callType === 'town'){
        fetchPromises = await arr.map(async (location) => {
          const response = await fetch(`${targetUrl}?Authorization=${this.authorizationId}&${queryType}${location}`);
          return response.json();
        });  
      }else if (callType ==='city'){
        const countiesString = arr.join(", ").replace(/\s*/g,"");
        fetchPromises = await fetch(`${targetUrl}?Authorization=${this.authorizationId}&${queryType}${countiesString}`);
        fetchPromises = await fetchPromises.json();  
      }else{
        let tempData = null;
        let mergefetchPromises = null;
        for(let i=0 ; i<targetUrl.length ; i++){    

          const response = await fetch(`${targetUrl[i]}?Authorization=${this.authorizationId}`);
          if(i==0){
            tempData = await response.json()
            tempData = tempData.records.Station

          }else{
            fetchPromises = await response.json()
            mergefetchPromises = {
              ...fetchPromises,
              records: {
                ...fetchPromises.records,
                Station: [...fetchPromises.records.Station, ...tempData]
              }
            }
          }         
        }
        fetchPromises = mergefetchPromises 
      }
      
      let responses = null;
      let weatherData = null;
      if(callType === 'town'){
        responses = await Promise.all(fetchPromises);
        weatherData ={
          data: responses.map(response => {
            const locations = response.records.locations;
            return locations;
          }).flat()}
      }else if (callType === 'city'){
        responses = fetchPromises     
        weatherData ={
          data:responses.records.locations
        }
      }else{
        responses = fetchPromises
        weatherData = {
          data : responses.records
        }
      }
      fs.writeFileSync(savePath, JSON.stringify(weatherData, null, 2));
      console.log(`${callType}已執行完畢`)
    } catch (e) {
      console.log(e);
    }
  }

  //生成API所需縣市ID
  generatorCitiesID(cityWeatherId, arr) {
    let arr_a = [];
    for (let i = 3; i < 88; i += 4) {
      let str = (i < 10) ? '00' + i : '0' + i;
      arr_a.push(cityWeatherId + str);
      if (arr_a.length >= 5 || 88 - i < 5) {
        arr.push(arr_a);
        arr_a = [];
      }
    }
    
    return arr;
  }
  //生成縣市名稱陣列
  generatorCitiesName() {
    return ['宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣',
            '連江縣', '臺北市', '新北市', '桃園市', '臺中市', '臺南市',
            '高雄市', '基隆市', '新竹縣', '新竹市', '苗栗縣', '彰化縣',
            '南投縣', '雲林縣', '嘉義縣', '嘉義市', '屏東縣'];
  }
  //建置氣象處理物件
  async createWeatherJob(targetUrl, callType, savePath) {
    await this.fetchData(targetUrl, callType, savePath);
  }
  
  //Cron測試
  // createWeatherJob(targetUrl, callType, savePath, cronSchedule) {
  //   return new cron.CronJob(cronSchedule, async () => { 
  //     await this.fetchData(targetUrl, callType, savePath);
  //   });
  // }
}

module.exports = WeatherDataFetcher;



