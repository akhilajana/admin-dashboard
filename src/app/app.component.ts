import { Component, OnInit } from '@angular/core';
import { SystemHealth } from './interface/system-health';
import { SystemCpu } from './interface/system-cpu';
import { DashboardService } from './service/dashboard.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { ChartType } from './enum/chart-type';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  public traceList: any[] = [];
  public selectedTrace: any;
  public systemHealth: SystemHealth | undefined;
  public systemCpu: SystemCpu | undefined;
  public processUpTime!: string;
  public http200Traces: any[] = [];
  public http400Traces: any[] = [];
  public http404Traces: any[] = [];
  public http500Traces: any[] = [];
  public httpDefaultTraces: any[] = [];
  public timestamp: number = 0;
  public pageSize = 10;
  public page = 1;

  constructor(private dashboardService:DashboardService){

  }
  ngOnInit(): void {
    this.getTraces();
    this.getCpuUsage();
    this.getSystemHealth();
    this.getProcessUptime(true);
    //TODO: Automatically refresh every 10 minutes 
  }

  private getTraces(): void {
    this.dashboardService.getHttpTraces().subscribe({
      next: (response:any) => {
        console.log(response);
        this.processTraces(response);
        this.initializeBarChart();
        this.initializePieChart();
      },
      error: (error: HttpErrorResponse) => {
        alert(error.message);
      },
      complete: () => console.log('Complete')
    })
  }

  private getCpuUsage(): void {
    this.dashboardService.getSystemCPU().subscribe(
      (response:SystemCpu) => {
        console.log(response);
        this.systemCpu = response;
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  private getSystemHealth(): void {
    this.dashboardService.getSystemHealth().subscribe(
      (response:SystemHealth) => {
        console.log(response);
        this.systemHealth = response;
        this.systemHealth.details.diskSpace.details.free = this.formatBytes(this.systemHealth.details.diskSpace.details.free)
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  public onRefreshData() : void {
    this.http200Traces = [];
    this.http400Traces = [];
    this.http404Traces = [];
    this.http500Traces = [];
    this.httpDefaultTraces = [];
    this.getTraces();
    this.getCpuUsage();
    this.getSystemHealth();
    this.getProcessUptime(false);
  }

  private getProcessUptime(isUpdatedTime : boolean): void {
    this.dashboardService.getSystemHealth().subscribe(
      (response:any) => {
        console.log(response);
        this.timestamp = Math.round(response.measurments[0].value);
        this.processUpTime = this.formatUpTime(this.timestamp);
        if(isUpdatedTime){
          this.updateTime();
        }
    },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }
  
  private processTraces(traces: any): void {
   this.traceList = traces;
   this.traceList.forEach(trace => {
    switch(trace.response.status) {
      case 200:
        this.http200Traces.push(trace);
        break;
      case 400:
        this.http400Traces.push(trace);
        break;
      case 404:
        this.http404Traces.push(trace);
        break;
      case 500:
        this.http500Traces.push(trace);
        break;
      default:
        this.httpDefaultTraces.push(trace);
        break;
    }
   })
  }

  private initializeBarChart() : Chart {
    const barChartElement = document.getElementById('barChart') as HTMLCanvasElement;
    return new Chart(barChartElement, {
      type: ChartType.BAR,
      data: {
        labels: ['200','404','404','500'],
        datasets: [{data: [this.http200Traces.length,this.http404Traces.length,this.http400Traces.length,this.http500Traces.length],
        backgroundColor: ['rgb(40, 167, 69)','rgb(0,123,255)','rgb(253,126,20)','rgb(220,53,69)'],
        borderColor: ['rgb(40, 167, 69)','rgb(0,123,255)','rgb(253,126,20)','rgb(220,53,69)'],
        borderWidth: 3
      }]},
      options: {
        plugins: {
          title: { display: true, text: [`Last 100 Requests as of ${new Date()}`]},
          legend: {display: false}
        },
        scales: {
          y: {beginAtZero: true}
        }
      } 
    })
}

private initializePieChart() : any {
  const pieChartElement = document.getElementById('pieChart') as HTMLCanvasElement;
  return new Chart(pieChartElement, {
    type: ChartType.PIE,
    data: {
      labels: ['200','404','404','500'],
      datasets: [{data: [this.http200Traces.length,this.http404Traces.length,this.http400Traces.length,this.http500Traces.length],
      backgroundColor: ['rgb(40, 167, 69)','rgb(0,123,255)','rgb(253,126,20)','rgb(220,53,69)'],
      borderColor: ['rgb(40, 167, 69)','rgb(0,123,255)','rgb(253,126,20)','rgb(220,53,69)'],
      borderWidth: 3
    }]
  },
    options: {
      plugins: {
      title: { display: true, text: [`Last 100 Requests as of ${new Date()}`]},
      legend: {display: true}
    }
      //display: true
    } 
  })
}

public exportTableToExcel() : void {
  const downloadLink = document.createElement('a');
  const dataType = 'application/vnd.ms-excel';
  const table = document.getElementById('httptrace-table');
  const tableHtml = table?.outerHTML.replace(/ /g, '%20');
  document.body.appendChild(downloadLink);
  downloadLink.href = 'data:'+dataType+' '+tableHtml;
  downloadLink.download = 'httptrace.xls';
  downloadLink.click();
}

  public onSelectTrace(trace: any): void {
    this.selectedTrace = trace;
    document.getElementById('trace-modal')?.click();
  }

  private updateTime(): void {
    setInterval(() => {
      this.processUpTime = this.formatUpTime(this.timestamp +1);
      this.timestamp++;
    },1000)
  }

  private formatBytes(bytes: any): string  {
   if(bytes === 0){
    return '0 Bytes';
   }
   const k = 1024;
   const dm = 2 < 0 ? 0 :2;
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   const i = Math.floor(Math.log(bytes)/Math.log(k));
   return parseFloat((bytes/Math.pow(k,i)).toFixed(dm))+' '+ sizes[i];
  }

  private formatUpTime(timestamp: number): string {
    const hours = Math.floor(timestamp/60/60);
    const minutes = Math.floor(timestamp / 60) - (hours * 60);
    const seconds = timestamp % 60;
    return hours.toString().padStart(2,'0') + 'h' + minutes.toString().padStart(2,'0') + 'm' + seconds.toString().padStart(2,'0') + 's';
  }

  private formatDate(date: Date) : string {
    const dd = date.getDate();
    const mm = date.getMonth() +1;
    const year = date.getFullYear();

    if(dd < 10) {
      const day = `0${dd}`;
    }
    if(mm < 10) {
      
    }
    return "";
  }

}
