const express = require('express');
const fs = require('fs');
const path =require('path')
const fetch = require('node-fetch')

class WeatherAPI {
  constructor() {
    this.router = express.Router();
    this.router.get('/v1/weatherWeek/cities', this.getCitiesWeather.bind(this));
    this.router.get('/v1/weatherWeek/towns', this.getTownsWeather.bind(this));
    this.router.get('/v1/weatherCurrent',this.getCurrentWeather.bind(this))
  }

  //縣市一周氣象API
  getCitiesWeather(req, res, next) {
    const { cityName, weatherCode, startTime, endTime } = req.query;

    const queryFilter = {'cityName':cityName,'weatherCode':weatherCode,'startTime':startTime,'endTime':endTime,'fetchType':'cities'}

    this.handleWeatherRequest(req, res,queryFilter);
  }
  //鄉鎮一周氣象API
  getTownsWeather(req, res, next) {
    const { cityName, townName, weatherCode, startTime, endTime } = req.query;
    const queryFilter = {'cityName':cityName,'weatherCode':weatherCode,'startTime':startTime,'endTime':endTime,'fetchType':'towns','secondFilter':townName}
    this.handleWeatherRequest(req, res,queryFilter);
  }
  //縣市and鄉鎮即時氣象API
  getCurrentWeather(req,res,next){
    const {cityName,townName,queryType,weatherCode} = req.query;  
    const queryFilter = {'cityName':cityName,'townName':townName,'queryType':queryType,'weatherCode':weatherCode,'fetchType':'none'}  
    this.handleWeatherRequest(req, res, queryFilter);
  }

  async fetchWeatherAPI(cityName, weatherCode, startTime, endTime, fetchType, secondFilter){
    const authorizationId = 'CWA-C5F6B52E-9E19-441A-97F0-865BB024FE0D'
    const cityWeatherId = 'F-D0047-';
    const apiUrl ='https://opendata.cwa.gov.tw/api/v1/rest/datastore/'

    const cityNumber ={
      '宜蘭縣':'003',
      "桃園市":'007',
      "新竹縣":'011',
      "苗栗縣":'015',
      "彰化縣":'019',
      "南投縣":'023',
      "雲林縣":'027',
      "嘉義縣":'031',
      "屏東縣":'035',
      "臺東縣":'039',
      "花蓮縣":'043',
      "澎湖縣":'047',
      "基隆市":'051',
      "新竹市":'055',
      "嘉義市":'059',
      "臺北市":'063',
      "高雄市":'067',
      "新北市":'071',
      "臺中市":'075',
      "臺南市":'079',
      "連江縣":'083',
      "金門縣":'087'
    }

    if(fetchType === 'cities'){
      let targetUrl = `${apiUrl}${cityWeatherId}091`
      const response = await fetch(`${targetUrl}?Authorization=${authorizationId}&locationName=${cityName}`);
      const data =await response.json()
      return data.records.locations[0].location[0]
    }else if(fetchType === 'towns'){
      const number = cityNumber[cityName]
      let targetUrl = `${apiUrl}${cityWeatherId}${number}`
      const response = await fetch(`${targetUrl}?Authorization=${authorizationId}&locationName=${secondFilter}`);
      const data =await response.json()
      return data.records.locations[0].location[0]
    }else if(fetchType === 'none'){
      let targetUrl =['O-A0003-001','O-A0001-001']
      let tempData = null;
      let mergefetchPromises = null;
      let fetchPromises = null;
      for(let i=0 ; i<targetUrl.length ; i++){
        const response = await fetch(`${apiUrl}${targetUrl[i]}?Authorization=${authorizationId}`);
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
      let responses =null;
      responses = fetchPromises
      return responses.records
    }       
  }

  //檢查使用type檔案與取得對應資料
  async handleWeatherRequest(req, res, queryFilter) {
    if (!queryFilter.cityName) {
      res.status(400).json({ error: 'City name is required' });
      return;
    }

    let result = null;

    let fileName = ''
    if(queryFilter.fetchType === 'cities'){
      fileName = 'weather_city.json'
    }else if (queryFilter.fetchType === 'towns'){
      fileName = 'weather_town.json'
    }else{
      fileName = 'weather_current.json'
    }    

    const cityName = queryFilter.cityName
    const weatherCode = queryFilter.weatherCode
    const startTime = queryFilter.startTime
    const endTime = queryFilter.endTime
    const fetchType = queryFilter.fetchType
    const secondFilter = queryFilter.secondFilter

    if(queryFilter.fetchType !== 'none'){  
      result = await this.fetchWeatherAPI(cityName, weatherCode, startTime, endTime, fetchType, secondFilter)
    }else{      
      let data= await this.fetchWeatherAPI(cityName, weatherCode, startTime, endTime, fetchType, secondFilter)
      console.log(data)
      let queryData = data['Station'].find(item => {
        if(queryFilter.queryType === 'CITY'){
          return item.GeoInfo.CountyName === queryFilter.cityName
        }else{
          return item.GeoInfo.CountyName === queryFilter.cityName && item.GeoInfo.TownName === queryFilter.townName
        }
      });
      result = queryData
    }
    res.status(200).json({ success: true, data: result });
  }
}

const weatherAPI = new WeatherAPI();

module.exports = weatherAPI.router;