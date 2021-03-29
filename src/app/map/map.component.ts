import { Component, OnInit } from '@angular/core';
import { loadModules } from 'esri-loader';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  map: any;
  view: any;
  displayTable = false;
  featureLayer: any;
  features: any;


  constructor() { }

  ngOnInit(): void {
    this.createMap();
  }

  async createMap() {
    const [Map, MapView, FeatureLayer, LayerList] = await loadModules(['esri/Map', 'esri/views/MapView', 'esri/layers/FeatureLayer', 'esri/widgets/LayerList']);

    this.map = new Map({ basemap: "streets" });

    this.view = new MapView({
      center: [-74.2478963, 4.6486259],
      container: 'map',
      map: this.map,
      zoom: 5,
    });

    const featureLayer = new FeatureLayer({
      url: 'https://geovisor.anh.gov.co/server/rest/services/Tierras/Mapa_ANH/MapServer/7',
    });
    this.map.add(featureLayer);

    const layerlist = new LayerList({
      view: this.view,
      listItemCreatedFunction: (event) => {
        const item = event.item;
        item.actionsSections = [
          [{
            title: 'Tabla de Atributos',
            className: 'esri-icon-table',
            id: 'attr-table'
          }],
          [{
            title: 'Aumentar opacidad',
            className: 'esri-icon-up',
            id: 'increase-opacity'
          }, {
            title: 'Reducir opacidad',
            className: 'esri-icon-down',
            id: 'decrease-opacity'
          }]
        ]
      }
    });

    this.view.when(() => {
      layerlist.on('trigger-action', (event) => {
        const layer = event.item.layer;
        if (event.action.id === 'attr-table') {
          this.showTable(layer);
        }
      })
    });

    this.view.ui.add(layerlist, { position: "top-right" });
  }

  public showTable(layer: any): void {
    const query = {
      outFields: ['*'],
      returnGeometry: false,
      where: ''
    };
    layer.queryFeatures(query).then((result) => {
      this.displayTable = true;
      this.featureLayer = layer;
      this.features = result.features;
    });
  }

  public hideTable(): void {
    this.displayTable = false;
    this.featureLayer = undefined;
  }
}
