const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const Processor = require('../public/javascripts/weatherData.js');

require('dotenv').config()

class WeatherAPI {
  constructor() {
    this.router = express.Router();
    this.router.get('/v1/weatherWeek/cities', this.getCitiesWeather.bind(this));
    this.router.get('/v1/weatherWeek/towns', this.getTownsWeather.bind(this));
    this.router.get('/v1/weatherCurrent', this.getCurrentWeather.bind(this));
  }

  getCitiesWeather(req, res, next) {
    const { cityName, weatherCode, perType } = req.query;
    if (!cityName) {
      return res.status(400).json({ error: 'Missing required query parameters.' });
    }
    const queryFilter = { cityName, weatherCode, fetchType: 'cities', perType: perType || 'Week' };
    this.handleWeatherRequest(req, res, queryFilter);
  }

  getTownsWeather(req, res, next) {
    const { cityName, townName, weatherCode, perType } = req.query;
    if (!cityName && !townName) {
      return res.status(400).json({ error: 'Missing required query parameters.' });
    }
    const queryFilter = { cityName, weatherCode, fetchType: 'towns', secondFilter: townName, perType: perType || 'Week' };
    this.handleWeatherRequest(req, res, queryFilter);
  }

  getCurrentWeather(req, res, next) {
    const { cityName, townName, queryType, weatherCode } = req.query;
    if (!cityName && !queryType) {
      return res.status(400).json({ error: 'Missing required query parameters.' });
    }
    const queryFilter = { cityName, townName, queryType, weatherCode, fetchType: 'current' };
    this.handleWeatherRequest(req, res, queryFilter);
  }

  async fetchWeatherAPI(cityName, weatherCode, fetchType, secondFilter, perType = 'Week') {
    try {
      const authorizationId = process.env.CWA_GOV_WEATHER_OPENDATA_KEY;
      const cityWeatherId = process.env.CWA_GOV_WEATHER_OPENDATA_PATH;
      const apiUrl = process.env.CWA_GOV_WEATHER_OPENDATA_API;
  
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
      
      let findElement = perType === 'Week' ? ['紫外線指數'] : ['3小時降雨機率']
      if (perType === 'Week') {
        timeFromParam = addTimeParam(6, perType).split('.')[0];
      }
  
      if (perType === '3Hours'){
        timeFromParam = addTimeParam(0, perType).split('.')[0];
      }
      if(fetchType === 'cities'){
      
        let APItype = perType === 'Week' ? '091' : '089'
        let targetUrl = `${apiUrl}${cityWeatherId}${APItype}`
  
        let fetchURL = `${targetUrl}?Authorization=${authorizationId}&LocationName=${cityName}${timeFromParam}`
        let response = await fetch(fetchURL);
        let data = await response.json();   
        if(data===undefined){
          return undefined
        }
        data = data.records.Locations[0].Location[0] 
        data = Processor.handleDataOrganization(data,findElement)     
        return data
  
      }else if(fetchType === 'towns'){
        const number = cityNumber[cityName][perType]
        let targetUrl = `${apiUrl}${cityWeatherId}${number}`
        let fetchURL = `${targetUrl}?Authorization=${authorizationId}${secondFilter ? `&LocationName=${secondFilter}` : '' }${timeFromParam}`;
        const response = await fetch(fetchURL);
        let data = await response.json();
        data = data.records.Locations[0].Location[0]     
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
    } catch (error) {
      console.error(`Error fetching weather API: ${error.message}`);
      return null;
    }
  }

  async handleWeatherRequest(req, res, queryFilter) {
    try {
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
    } catch (error) {
      console.error(`Error handling weather request: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

const weatherAPI = new WeatherAPI();
module.exports = weatherAPI.router;

