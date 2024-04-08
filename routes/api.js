const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch')

const WeatherDataFetcher = require('./updateData')

class WeatherAPI {
  constructor() {
    this.router = express.Router();
    this.router.get('/v1/weatherWeek/cities', this.getCitiesWeather.bind(this));
    this.router.get('/v1/weatherWeek/towns', this.getTownsWeather.bind(this));
    this.router.get('/v1/weatherCurrent',this.getCurrentWeather.bind(this))
    this.router.get('/v2/updateWeatherData',this.updateWeatherData.bind(this))
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

  //更新API資料
  async updateWeatherData(req,res,next){    
    const { fetchType } = req.query

    const authorizationId = 'CWA-C5F6B52E-9E19-441A-97F0-865BB024FE0D'
    const job1_week_city_url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091'
    const job2_week_town_url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-093'
    const job1_current_url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001'
    const job1_current_second_url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001'

    const weather_job = new WeatherDataFetcher(authorizationId)

    if(fetchType === 'week'){
      await weather_job.createWeatherJob(job1_week_city_url,'city',`/data/weather_city.json`)
      await weather_job.createWeatherJob(job2_week_town_url,'town',`/data/weather_town.json`)
      return res.json({'success':'true'})
    }else if(fetchType === 'none'){
      await weather_job.createWeatherJob([job1_current_url,job1_current_second_url],fetchType,`/data/weather_current.json`)
      return res.json({'success':'true'})
    }else{
      return res.json({'success':'false','error':'no-fetchType'})
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
    const data = await this.loadData(fileName);

    if(queryFilter.fetchType !== 'none'){  
      const cityName = queryFilter.cityName
      const weatherCode = queryFilter.weatherCode
      const startTime = queryFilter.startTime
      const endTime = queryFilter.endTime
      const fetchType = queryFilter.fetchType
      const secondFilter = queryFilter.secondFilter
  
      result = this.filterWeatherData(data, cityName, weatherCode, startTime, endTime, fetchType, secondFilter);
      
    }else{      
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

  //讀取天氣資料
  async loadData(fileName) {
    const url = `https://${process.env.VERCEL_URL}/data/${fileName}`;
    const jsonData = await fetch(url);
    return JSON.parse(jsonData)['data'];
  }

  //城市or城鎮過濾器
  filterWeatherData(data, firstFilter, weatherCode, startTime, endTime, fetchType, secondFilter = undefined) {
    let queryData;
    
    if (fetchType === 'cities') {

      queryData = data[0]['location'].find(item => item.locationName === firstFilter);
    } else if (fetchType === 'towns') {
      const filteredCityData = data.find(item => item.locationsName === firstFilter);
      if (secondFilter !== undefined && filteredCityData !== undefined) {
        queryData = filteredCityData['location'].find(item => item.locationName === secondFilter);
      }else if (filteredCityData !== undefined){
        queryData = filteredCityData
      }
    }
    if(fetchType === 'none'){
      return queryData
    }
    return this.applyFilters(queryData, weatherCode, startTime, endTime, fetchType, secondFilter);
  }

  //過濾天氣因子
  filterWeatherCode(data, keepDataArr) {
    if (!data || keepDataArr.length === 0) {
      return data;
    }
  
    data.weatherElement = data.weatherElement.filter(element => keepDataArr.includes(element.elementName));
    return data;
  }
  
  //過濾時間
  filterTimeData(data, startTimeRange, endTimeRange) {
    if (!data.weatherElement || !startTimeRange || !endTimeRange) {
      return data;
    }
  
    data.weatherElement = data.weatherElement.map(element => ({
      ...element,
      time: element.time.filter(timeData => {
        const startTime = new Date(timeData.startTime);
        const endTime = new Date(timeData.endTime);
  
        return startTime >= startTimeRange && endTime <= endTimeRange;
      }),
    }));
  
    return data;
  }
  
  //檢查時間閥值是否超過資料範圍
  clearEmptyData(data) {
    if (data.weatherElement.every(element => element.time.length === 0)) {
      data = {};
    }
    return data;
  }
  
  //次要篩選工具
  applyFilters(data, weatherCode, startTime, endTime, fetchType, secondFilter) {
    const keepDataArr = weatherCode ? weatherCode.split(',') : [];
  
    if (secondFilter !== undefined || fetchType === 'cities') {
      data = this.filterWeatherCode(data, keepDataArr);
      data = this.filterTimeData(data, startTime ? new Date(startTime) : undefined, endTime ? new Date(endTime) : undefined);
      data = this.clearEmptyData(data);
    } else {
      if (data.location) {
        data.location.forEach((location) => {
          location.weatherElement = this.filterWeatherCode(location.weatherElement, keepDataArr);
          location.weatherElement = this.filterTimeData(
            location.weatherElement,
            startTime ? new Date(startTime) : undefined,
            endTime ? new Date(endTime) : undefined
          );
        });
        data.location = data.location.filter(location => location.weatherElement.some(element => element.time.length > 0));
      }
    }
  
    return data;
  }
}

const weatherAPI = new WeatherAPI();

module.exports = weatherAPI.router;