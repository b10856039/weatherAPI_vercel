class WeatherDataProcessor {  
    //時間處理
    timeProcess(date) {
      let year = date.getFullYear();
      let month = (date.getMonth() + 1).toString().padStart(2, '0');
      let day = date.getDate().toString().padStart(2, '0');
      let hours = date.getHours().toString().padStart(2, '0');
      let minutes = date.getMinutes().toString().padStart(2, '0');
      let seconds = date.getSeconds().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    //UVI資料補齊
    handleUVIData(timeData, newElement) {
      return timeData.map((item, index) => {
        let newStartTime = item.endTime;
        let newEndTime = '';
  
        if (timeData[index + 1] === undefined) {
          let originDate = new Date(newStartTime);
          originDate.setHours(originDate.getHours() + 12);
          newEndTime = this.timeProcess(originDate);
        } else {
          newEndTime = timeData[index + 1].startTime;
        }
  
        let newObject = {
          startTime: newStartTime,
          endTime: newEndTime,
          elementValue: newElement
        };
        return [item, newObject];
      }).flat();
    }
    //降雨機率資料補齊
    handlePoPData(timeData) {
      let newData = [];
      timeData.forEach((item) => {
        let originStartTime = new Date(item.startTime);
        let originEndTime = new Date(item.endTime);
        
        let interval = 3; 
        let currentTime = new Date(originStartTime);
        
        while (currentTime < originEndTime) {
          let newStartTime = this.timeProcess(currentTime);
          let newEndTime = this.timeProcess(new Date(currentTime.getTime() + interval * 3600000));
  
          newData.push({
            startTime: newStartTime,
            endTime: newEndTime,
            elementValue: item.elementValue
          });
          currentTime = new Date(currentTime.getTime() + interval * 3600000);
        }
      });
      return newData;
    }
  
    handleDataOrganization(weather, findElement) {
      for (const element of findElement) {
        let replaceElementIndex = weather.weatherElement.findIndex((item) => {
          return item.elementName === element;
        });
        
        let timeData = weather.weatherElement[replaceElementIndex].time;
        let inputElement = [];
  
        if (element === 'UVI') {
          inputElement = [{
            value: ' ',
            measures: "紫外線指數"
          }, {
            value: "低量級",
            measures: "曝曬級數"
          }];
          timeData = this.handleUVIData(timeData, inputElement);
        } else if (element === 'PoP12h' || element === 'PoP6h') {
          timeData = this.handlePoPData(timeData);
        }
        weather.weatherElement[replaceElementIndex].time = timeData;
      }
      return weather;
    }
}


const processor =new WeatherDataProcessor();

module.exports = processor;