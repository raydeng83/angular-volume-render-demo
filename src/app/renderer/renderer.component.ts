import {Component, OnInit} from '@angular/core';
import {GUI} from "dat.gui";
import * as THREE from 'three';
import * as STATS from 'stats-js';
import * as AMI from 'ami.js'

@Component({
  selector: 'app-renderer',
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.css']
})
export class RendererComponent implements OnInit {
  controls;
  threeD;
  renderer;
  stats;
  camera;
  scene;
  vrHelper;
  lut;
  ready = false;
  file = 'https://cdn.rawgit.com/FNNDSC/data/master/nifti/eun_brain/eun_uchar_8.nii.gz';
  loader;

  myStack = {
    lut: 'random',
    opacity: 'random',
    steps: 256,
    alphaCorrection: 0.5,
    interpolation: 1
  };

  constructor() {
  }

  onMouseDown() {
    if (this.vrHelper && this.vrHelper.uniforms) {
      this.vrHelper.uniforms.uSteps.value = Math.floor(this.myStack.steps / 2);
      this.vrHelper.interpolation = 0;
    }
  }

  onMouseUp() {
    if (this.vrHelper && this.vrHelper.uniforms) {
      this.vrHelper.uniforms.uSteps.value = this.myStack.steps;
      this.vrHelper.interpolation = this.myStack.interpolation;
    }
  }

  onWindowResize() {
    // update the camera
    this.camera.aspect = this.threeD.offsetWidth / this.threeD.offsetHeight;
    this.camera.updateProjectionMatrix();

    // notify the renderer of the size change
    this.renderer.setSize(this.threeD.offsetWidth, this.threeD.offsetHeight);
  }

  buildGUI() {
    var gui = new GUI({
      autoPlace: false
    });

    var customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    var stackFolder = gui.addFolder('Settings');
    var lutUpdate = stackFolder.add(this.myStack, 'lut', this.lut.lutsAvailable());
    lutUpdate.onChange(function (value) {
      this.lut.lut = value;
      this.vrHelper.uniforms.uTextureLUT.value.dispose();
      this.vrHelper.uniforms.uTextureLUT.value = this.lut.texture;
    });
    // init LUT
    this.lut.lut = this.myStack.lut;
    this.vrHelper.uniforms.uTextureLUT.value.dispose();
    this.vrHelper.uniforms.uTextureLUT.value = this.lut.texture;

    var opacityUpdate = stackFolder.add(this.myStack, 'opacity', this.lut.lutsAvailable('opacity'));
    opacityUpdate.onChange(function (value) {
      this.lut.lutO = value;
      this.vrHelper.uniforms.uTextureLUT.value.dispose();
      this.vrHelper.uniforms.uTextureLUT.value = this.lut.texture;
    });

    var stepsUpdate = stackFolder.add(this.myStack, 'steps', 0, 512).step(1);
    stepsUpdate.onChange(function (value) {
      if (this.vrHelper.uniforms) {
        this.vrHelper.uniforms.uSteps.value = value;
      }
    });

    var alphaCorrrectionUpdate = stackFolder.add(this.myStack, 'alphaCorrection', 0, 1).step(0.01);
    alphaCorrrectionUpdate.onChange(function (value) {
      if (this.vrHelper.uniforms) {
        this.vrHelper.uniforms.uAlphaCorrection.value = value;
      }
    });

    stackFolder.add(this.vrHelper, 'interpolation', 0, 1).step(1);

    stackFolder.open();
  }

  animate() {
    // render
    this.controls.update();

    if (this.ready) {
      this.renderer.render(this.scene, this.camera);
    }

    // this.stats.update();

    // request new frame
    const that = this;
    requestAnimationFrame(function () {
      that.animate();
    });
  }

  ngOnInit(): void {
    // renderer
    this.threeD = document.getElementById('r3d');
    this.renderer = new THREE.WebGLRenderer({
      alpha: true
    });
    this.renderer.setSize(this.threeD.offsetWidth, this.threeD.offsetHeight);
    this.threeD.appendChild(this.renderer.domElement);

    // stats
    // this.stats = new Stats();
    // this.threeD.appendChild(this.stats.domElement);

    // scene
    this.scene = new THREE.Scene();

    // camera
    this.camera = new THREE.PerspectiveCamera(45, this.threeD.offsetWidth / this.threeD.offsetHeight, 0.1, 100000);
    this.camera.position.x = 150;
    this.camera.position.y = 400;
    this.camera.position.z = -350;
    this.camera.up.set(-0.42, 0.86, 0.26);

    // controls
    this.controls = new AMI.TrackballControl(this.camera, this.threeD);
    this.controls.rotateSpeed = 5.5;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;

    this.threeD.addEventListener('mousedown', this.onMouseDown, false);
    this.threeD.addEventListener('mouseup', this.onMouseUp, false);
    window.addEventListener('resize', this.onWindowResize, false);

    // start rendering loop
    this.animate();

    this.loader = new AMI.VolumeLoader(this.threeD);

    const that = this;
    this.loader.load(that.file).then(function() {
      var series = that.loader.data[0].mergeSeries(that.loader.data)[0];
      that.loader.free();
      that.loader = null;
      // get first stack from series
      var stack = series.stack[0];

      that.vrHelper = new AMI.VolumeRenderingHelper(stack);
      // scene
      that.scene.add(that.vrHelper);

      // CREATE LUT
      that.lut = new AMI.LutHelper('my-tf');
      that.lut.luts = AMI.LutHelper.presetLuts();
      that.lut.lutsO = AMI.LutHelper.presetLutsO();
      // update related uniforms
      that.vrHelper.uniforms.uTextureLUT.value = that.lut.texture;
      that.vrHelper.uniforms.uLut.value = 1;

      // update camrea's and interactor's target
      var centerLPS = stack.worldCenter();
      that.camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
      that.camera.updateProjectionMatrix();
      that.controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

      // create GUI
      that.buildGUI();

      that.ready = true;
    });
  }

}
