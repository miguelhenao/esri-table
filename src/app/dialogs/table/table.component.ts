import { loadModules } from 'esri-loader';
import { Component, Input, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

@Component({
	selector: 'app-table',
	templateUrl: './table.component.html',
	styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
	@Input() _this: any;
	@Input() layer: any;
	@Input() features: any;

	featureTable: any;
	featuresSelected: Array<any> = [];

	constructor() { }

	ngOnInit(): void {
		this.initTable();
	}

	public initTable(): void {
		loadModules(['esri/widgets/FeatureTable']).then(([FeatureTable,]) => {
			this.featureTable = new FeatureTable({
				container: 'table',
				layer: this.layer,
				view: this._this.view,
				attachmentsEnabled: true
			});

			this.featureTable.on("selection-change", (event) => {
				event.removed.forEach((item) => {
					const data = this.featuresSelected.find(function (data) {
						return data.featureWithAttributes === item.feature;
					});
					if (data) {
						this.featuresSelected.splice(this.featuresSelected.indexOf(data), 1);
					}
				});

				event.added.forEach((item) => {
					const feature = item.feature;
					const query = {
						objectIds: [item.objectId],
						returnGeometry: true
					};

					this.layer.queryFeatures(query).then((result) => {
						const featureWithGeometry = result.features[0];
						this.featuresSelected.push({
							featureWithAttributes: feature,
							featureWithGeometry
						});

						this.zoomToFeature(featureWithGeometry);
					});
				});
			});
		});
	}

	public zoomToFeature(feature: any): void {
		loadModules(['esri/tasks/GeometryService', 'esri/geometry/SpatialReference', 'esri/tasks/support/ProjectParameters'])
			.then(([GeometryService, SpatialReference, ProjectParameters]) => {
				const geometry = feature.geometry;
				const geomSvc = new GeometryService('https://anh-gisserver.anh.gov.co/arcgis/rest/services/Utilities/Geometry/GeometryServer');
				const outSR = new SpatialReference({ wkid: 4326 });
				const params = new ProjectParameters({
					geometries: [geometry],
					outSpatialReference: outSR
				});

				geomSvc.project(params).then((response) => {
					this._this.view.goTo(response[0]);
				});
			});
	}

	public downloadExcel(): void {
		const attributes: Array<any> = [];
		const features = this.featuresSelected.length === 0 ? this.features :
      this.featuresSelected.map(feature => { return feature.featureWithAttributes });

		features.forEach((feature) => {
			const attr = feature.attributes;
			attributes.push(attr);
		});

		if (attributes.length > 0) {
			const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
			const EXCEL_EXTENSION = '.xlsx';
			const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(attributes);
			const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
			const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
			const dataBuffer: Blob = new Blob([excelBuffer], { type: EXCEL_TYPE });
			FileSaver.saveAs(dataBuffer, this._this.featureLayer.title + EXCEL_EXTENSION);
		}
	}

	public downloadShapeFile(): void {
		if (this.featuresSelected.length > 0) {
      const features = this.featuresSelected.map(feature => { return feature.featureWithGeometry });
      this.downloadFromQuery(features);
    } else {
      //
    }
	}

	private downloadFromQuery(features: any): void {
		loadModules(['esri/tasks/support/FeatureSet', 'esri/tasks/Geoprocessor']).then(([FeatureSet, Geoprocessor]) => {
			const gpExtract = new Geoprocessor({
				url: 'https://geovisor.anh.gov.co/server/rest/services/ExtractShape/GPServer/ExtractShape',
				outSpatialReference: {
					wkid: 4326
				}
			});

			const featureSet = new FeatureSet();
			featureSet.features = features;
			const params = {
				Layers_to_Clip: ['Tierras 2020-12-15'],
				Area_of_Interest: featureSet,
				Feature_Format: 'Shapefile - SHP - .shp'
			};

			gpExtract.submitJob(params).then((jobInfo) => {
				const options = {
					statusCallback: () => { }
				};
				gpExtract.waitForJobCompletion(jobInfo.jobId, options).then((jobInfo2) => {
					if (!jobInfo2.jobStatus.includes('fail')) {
						gpExtract.getResultData(jobInfo.jobId, 'Output_Zip_File').then((outputFile) => {
							const theurl = outputFile.value.url;
							window.location = theurl;
						});
					}
				})
			})
		})
	}
}
