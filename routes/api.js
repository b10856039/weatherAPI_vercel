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


  timeProcess(Date) {
    let year = Date.getFullYear();
    let month = (Date.getMonth() + 1).toString().padStart(2, '0');
    let day = Date.getDate().toString().padStart(2, '0');
    let hours = Date.getHours().toString().padStart(2, '0');
    let minutes = Date.getMinutes().toString().padStart(2, '0');
    let seconds = Date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  handleUVIData(timeData,newElement){
    timeData = timeData.map((item,index)=>{
      let newStartTime = timeData[index].endTime
      let newEndTime = ''

      if(timeData[index+1] === undefined){
        let originDate = new Date(newStartTime)
        originDate.setHours(originDate.getHours()+12)
        newEndTime = this.timeProcess(originDate)

      }else{          
        newEndTime = timeData[index+1].startTime
      }

      let newObject = {
        startTime:newStartTime,
        endTime:newEndTime,
        elementValue: newElement
      }
      return [item,newObject]
    })
    return timeData.flat()
  }

  handlePoPData(timeData) {
      let newData = [];
      timeData.forEach((item, index) => {
          let originStartTime = new Date(item.startTime);
          let originEndTime = new Date(item.endTime);
          
          let interval = 3;
          let currentTime = new Date(originStartTime); // 深層複製原始時間
          // 以每 interval 小時增加一筆資料，直到 endTime
          while (currentTime < originEndTime) {
              let newStartTime = this.timeProcess(currentTime);
              let newEndTime = this.timeProcess(new Date(currentTime.getTime() + interval * 60 * 60 * 1000));

              newData.push({
                  startTime: newStartTime,
                  endTime: newEndTime,
                  elementValue: item.elementValue
              });
              currentTime = new Date(currentTime.getTime() + interval * 60 * 60 * 1000);
          }
      });
      return newData;
  }

  handleDataOrganization(weather,findElement){    
    for(const element of findElement){
      let replaceElementIndex = weather.weatherElement.findIndex((item)=>{
        return item.elementName === element
      })  
      console.log(findElement)
      console.log(weather.weatherElement[replaceElementIndex])
      let timeData = weather.weatherElement[replaceElementIndex].time
      let inputElement = []

      if(element === 'UVI'){
        inputElement = [
          {
            value: ' ',
            measures: "紫外線指數"
          },
          {
            value: "低量級",
            "measures": "曝曬級數"
          }
        ]
        timeData = this.handleUVIData(timeData,inputElement)   
      }else if(element === 'PoP12h'){         
        timeData = this.handlePoPData(timeData) 
      }else if(element === 'PoP6h'){
        timeData = this.handlePoPData(timeData) 
      }
      weather.weatherElement[replaceElementIndex].time = timeData 
    }      
    return weather
  }

  async fetchWeatherAPI(cityName, weatherCode, fetchType, secondFilter,perType = undefined){
    const authorizationId = 'CWA-C5F6B52E-9E19-441A-97F0-865BB024FE0D'
    const cityWeatherId = 'F-D0047-';
    const apiUrl ='https://opendata.cwa.gov.tw/api/v1/rest/datastore/'

    const cityNumber ={
      '宜蘭縣':{'3Hours':'001','Week':'003'},
      "桃園市":{'3Hours':'005','Week':'007'},
      "新竹縣":{'3Hours':'009','Week':'011'},
      "苗栗縣":{'3Hours':'013','Week':'015'},
      "彰化縣":{'3Hours':'017','Week':'019'},
      "南投縣":{'3Hours':'021','Week':'023'},
      "雲林縣":{'3Hours':'025','Week':'027'},
      "嘉義縣":{'3Hours':'029','Week':'031'},
      "屏東縣":{'3Hours':'033','Week':'035'},
      "臺東縣":{'3Hours':'037','Week':'039'},
      "花蓮縣":{'3Hours':'041','Week':'043'},
      "澎湖縣":{'3Hours':'045','Week':'047'},
      "基隆市":{'3Hours':'049','Week':'051'},
      "新竹市":{'3Hours':'053','Week':'055'},
      "嘉義市":{'3Hours':'057','Week':'059'},
      "臺北市":{'3Hours':'061','Week':'063'},
      "高雄市":{'3Hours':'065','Week':'067'},
      "新北市":{'3Hours':'069','Week':'071'},
      "臺中市":{'3Hours':'073','Week':'075'},
      "臺南市":{'3Hours':'077','Week':'079'},
      "連江縣":{'3Hours':'081','Week':'083'},
      "金門縣":{'3Hours':'085','Week':'087'}
    }



    const addTimeParam = (time, perType) => {
        const currentDate = new Date();
    
        if (perType === '3Hours') {
            currentDate.setDate(currentDate.getDate() + 2); // 加 2 天
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
    if (perType === 'Week' || perType === '3Hours') {
        timeFromParam = addTimeParam(6, perType).split('.')[0];
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
      data = this.handleDataOrganization(data,findElement)     
      return data

    }else if(fetchType === 'towns'){
      const number = cityNumber[cityName][perType]
      let targetUrl = `${apiUrl}${cityWeatherId}${number}`
      let fetchURL = `${targetUrl}?Authorization=${authorizationId}&locationName=${secondFilter}${timeFromParam}`;
      const response = await fetch(fetchURL);
      let data =await response.json()

      data = data.records.locations[0].location[0]      
      data = this.handleDataOrganization(data,findElement)     
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