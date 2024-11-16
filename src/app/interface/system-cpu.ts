export interface SystemCpu {

    name: string;
    description: string;
    baseUnit: any;
    measurments:[{statistic:string, value: number}]
    availableTags: any[]
    
}