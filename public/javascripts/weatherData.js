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
        let newStartTime = item.EndTime;
        let newEndTime = '';
  
        if (timeData[index + 1] === undefined) {
          let originDate = new Date(newStartTime);
          originDate.setHours(originDate.getHours() + 12);
          newEndTime = this.timeProcess(originDate);
        } else {
          newEndTime = timeData[index + 1].StartTime;
        }
  
        let newObject = {
          StartTime: newStartTime,
          EndTime: newEndTime,
          ElementValue: newElement
        };
        return [item, newObject];
      }).flat();
    }
    //降雨機率資料補齊
    handlePoPData(timeData) {
      let newData = [];
      timeData.forEach((item) => {
        let originStartTime = new Date(item.StartTime);
        let originEndTime = new Date(item.EndTime);
        
        let interval = 3; 
        let currentTime = new Date(originStartTime);
        
        while (currentTime < originEndTime) {
          let newStartTime = this.timeProcess(currentTime);
          let newEndTime = this.timeProcess(new Date(currentTime.getTime() + interval * 3600000));
  
          newData.push({
            StartTime: newStartTime,
            EndTime: newEndTime,
            ElementValue: item.ElementValue
          });
          currentTime = new Date(currentTime.getTime() + interval * 3600000);
        }
      });
      return newData;
    }
  
    handleDataOrganization(weather, findElement) {
      for (const element of findElement) {
        let replaceElementIndex = weather.WeatherElement.findIndex((item) => {
          return item.ElementName === element;
        });
        
        let timeData = weather.WeatherElement[replaceElementIndex].Time;
        let inputElement = [];
        if (element === '紫外線指數') {
          inputElement = [{
            'UVIndex': "4",
            'UVExposureLevel': " ",
          }];
          timeData = this.handleUVIData(timeData, inputElement);
        } else if (element === '3小時降雨機率') {
          timeData = this.handlePoPData(timeData);
        }
        weather.WeatherElement[replaceElementIndex].Time = timeData;
      }
      return weather;
    }
}


const processor =new WeatherDataProcessor();

module.exports = processor;