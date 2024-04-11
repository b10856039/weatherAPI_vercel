const express = require('express');
const fs = require('fs').promises;
const path =require('path')
const fetch = require('node-fetch')

const Processor = require('../public/javascripts/weatherData.js')

class WeatherAPI {
  constructor() {
    this.router = express.Router();
    this.router.get('/v1/weatherWeek/cities', this.getCitiesWeather.bind(this));
    this.router.get('/v1/weatherWeek/towns', this.getTownsWeather.bind(this));
    this.router.get('/v1/weatherCurrent',this.getCurrentWeather.bind(this))
  }

  //縣市一周氣象API
  getCitiesWeather(req, res, next) {
    const { cityName, weatherCode,perType } = req.query;
    const queryFilter = {'cityName':cityName,'weatherCode':weatherCode,'fetchType':'cities','perType':perType}
    this.handleWeatherRequest(req, res,queryFilter);
  }
  //鄉鎮一周氣象API
  getTownsWeather(req, res, next) {
    const { cityName, townName, weatherCode,perType } = req.query;
    const queryFilter = {'cityName':cityName,'weatherCode':weatherCode,'fetchType':'towns','secondFilter':townName,'perType':perType}
    this.handleWeatherRequest(req, res,queryFilter);
  }
  //縣市and鄉鎮即時氣象API
  getCurrentWeather(req,res,next){
    const {cityName,townName,queryType,weatherCode} = req.query;  
    const queryFilter = {'cityName':cityName,'townName':townName,'queryType':queryType,'weatherCode':weatherCode,'fetchType':'current'}  
    this.handleWeatherRequest(req, res, queryFilter);
  }

  //獲取API的Weather資料
  async fetchWeatherAPI(cityName, weatherCode, fetchType, secondFilter,perType = undefined){
    const authorizationId = 'CWA-C5F6B52E-9E19-441A-97F0-865BB024FE0D'
    const cityWeatherId = 'F-D0047-';
    const apiUrl ='https://opendata.cwa.gov.tw/api/v1/rest/datastore/'

    //讀取要獲取的API
    const filePath = path.join(__dirname,'..' ,'public', 'json', 'typeOfAPI.json');
    const responseJSON = await fs.readFile(filePath, 'utf8');
    const cityNumber = await JSON.parse(responseJSON)

    //添加獲取時間條件
    const addTimeParam = (time, perType) => {
        const currentDate = new Date();    
        if (perType === '3Hours') {
            currentDate.setDate(currentDate.getDate() + 3); // 加 2 天
            currentDate.setUTCHours(time, 0, 0, 0);
            const isoDateString = currentDate.toISOString();
            return `&timeTo=${isoDateString}`;
        } else if (perType === 'Week') {
            currentDate.setDate(currentDate.getDate() + 1); // 加 1 天
            currentDate.setUTCHours(time, 0, 0, 0); // 設置時間為早上6點
            const isoDateString = currentDate.toISOString();
            return `&timeFrom=${isoDateString}`;
        }
    }
    
    let timeFromParam = '';    
    if (perType === undefined) {
        perType = 'Week';
    }
    
    let findElement = perType === 'Week' ? ['UVI'] : ['PoP12h','PoP6h']
    if (perType === 'Week') {
      timeFromParam = addTimeParam(6, perType).split('.')[0];
    }

    if (perType === '3Hours'){
      timeFromParam = addTimeParam(0, perType).split('.')[0];
    }

    if(fetchType === 'cities'){
    
      let APItype = perType === 'Week' ? '091' : '089'
      let targetUrl = `${apiUrl}${cityWeatherId}${APItype}`

      let fetchURL = `${targetUrl}?Authorization=${authorizationId}&locationName=${cityName}${timeFromParam}`
      const response = await fetch(fetchURL);
      let data =await response.json()      

      if(data===undefined){
        return undefined
      }
      
      data = data.records.locations[0].location[0]      
      data = Processor.handleDataOrganization(data,findElement)     
      return data

    }else if(fetchType === 'towns'){
      const number = cityNumber[cityName][perType]
      let targetUrl = `${apiUrl}${cityWeatherId}${number}`
      let fetchURL = `${targetUrl}?Authorization=${authorizationId}&locationName=${secondFilter}${timeFromParam}`;
      const response = await fetch(fetchURL);
      let data =await response.json()

      data = data.records.locations[0].location[0]      
      data = Processor.handleDataOrganization(data,findElement)

      return data

    }else if(fetchType === 'current'){
      const targetUrls = ['O-A0003-001', 'O-A0001-001'];
      const fetchPromises = targetUrls.map(async (targetUrl) => {
        const response = await fetch(`${apiUrl}${targetUrl}?Authorization=${authorizationId}`);
        return response.json();
      });
  
      const responses = await Promise.all(fetchPromises);
      const mergedRecords = responses.reduce((acc, response) => {
        if (!acc) {
          return response.records;
        } else {
          return {
            ...acc,
            Station: [...acc.Station, ...response.records.Station]
          };
        }
      }, null);
  
      return mergedRecords;
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
    const fetchType = queryFilter.fetchType
    const secondFilter = queryFilter.secondFilter

    if(queryFilter.fetchType !== 'current'){  
      const perType = queryFilter.perType

      result = await this.fetchWeatherAPI(cityName, weatherCode, fetchType, secondFilter,perType)
    }else{      
      let data= await this.fetchWeatherAPI(cityName, weatherCode, fetchType, secondFilter)

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