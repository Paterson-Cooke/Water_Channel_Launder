
function setup() {
  createCanvas(800, 900);
}

function draw() {
  // inputs
  var flow_rate = Number(document.getElementById("fr").value);
  var channel_width = Number(document.getElementById("cw").value);
  var channel_height = Number(document.getElementById("ht").value);
  var wall_thickness = Number(document.getElementById("wt").value);
  var wall_roughness = Number(document.getElementById("wr").value);
  var segment_length = Number(document.getElementById("sl").value);
  var elevation_drop = Number(document.getElementById("ed").value);
  var water_temperature = Number(document.getElementById("te").value);
  var bend_radius = Number(document.getElementById("br").value);

  // calculations
  var water_density = Water('density', water_temperature);
  var water_viscosity = Water('viscosity', water_temperature);
  var slope = abs(elevation_drop / segment_length);
  var velocity = channel_launder_water(channel_width, channel_height, flow_rate, slope, water_viscosity, water_density, wall_roughness, '2');
  var fluid_height = channel_launder_water(channel_width, channel_height, flow_rate, slope, water_viscosity, water_density, wall_roughness, '4');
  var y_over_d = fluid_height / channel_height;
  var froude = velocity / (fluid_height * 9.81) ** 0.5;
  var bend_width = channel_width;
  var bend_radius = bend_width * bend_radius;
  var n = bend_radius / bend_width;
  var superelevation_height = velocity ** 2 / (9.81 * n);
  var fluid_height_bend = fluid_height + superelevation_height;
  var y_over_d_bend = fluid_height_bend / channel_height;

  // output channel image
  background('whitesmoke');
  var scale = 2;
  var draw_width = channel_width * 100 * scale; // m to cm
  var draw_height = channel_height * 100 * scale; // m to cm
  var draw_thickness = wall_thickness / 10 * scale; // mm to cm
  var draw_fluid_height = fluid_height * 100 * scale; // m to cm
  var center_x = width / 2;
  var center_y = (height / 7) + draw_height;
  stroke('black');
  fill('black');
  rectMode(CENTER);
  rect(center_x, center_y, draw_width, draw_thickness); // bottom
  rectMode(CORNER);
  rect(center_x - draw_width / 2 - draw_thickness, center_y + draw_thickness / 2, draw_thickness, - draw_height - draw_thickness); // left wall
  rect(center_x + draw_width / 2, center_y + draw_thickness / 2, draw_thickness, - draw_height - draw_thickness); // right wall

  // output water fill
  stroke('blue');
  fill('blue');
  rect(center_x - draw_width / 2, center_y - draw_thickness / 2, draw_width, -draw_fluid_height);
  fill('black');

  // output text
  fill('black');
  noStroke();
  textFont('Courier New');
  textSize(16);
  var x_location = 20;
  var y_location = 20;
  var y_spacing = 20;
  text('Slope (%):               ' + (100 * slope).toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  text('Velocity (m/s):          ' + velocity.toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  if (fluid_height == channel_height) {
    fill('red');
    text('Fluid height (m):        OVERFLOW', x_location, y_location);
    fill('black');
  } else {
    text('Fluid height (m):        ' + fluid_height.toPrecision(4), x_location, y_location);
  }
  y_location = y_location + y_spacing;
  text('Percent full (%):        ' + (100 * y_over_d).toPrecision(3) + '%', x_location, y_location);
  y_location = y_location + y_spacing;
  text('Froude number (-):       ' + froude.toPrecision(4), x_location, y_location);
  y_location = y_location + y_spacing;
  x_location = 375;
  y_location = 20;
  text('Bend width (m):                 ' + bend_width.toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  text('Bend radius (m):                ' + bend_radius.toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  text('Bend superelevation height (m): ' + superelevation_height.toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  text('Fluid height in bend (m):       ' + fluid_height_bend.toPrecision(3), x_location, y_location);
  y_location = y_location + y_spacing;
  text('Percent full in bend (%):       ' + (100 * y_over_d_bend).toPrecision(3) + '%', x_location, y_location);
  text('lee.goudzwaard@patersoncooke.com', 5, height - 5);
}

function channel_launder_water(channel_width, channel_height, flow, slope, viscosity, density, roughness, output) {
  var high = channel_height * 1.05;
  var low = 0;
  var count = 1;
  var diff = 1;
  // calculate the gravity Portion
  var dPdL_gravity = density * 9.81 * slope;
  if (dPdL_gravity == 0) {
    return 0;
  } else {
    while (diff > 0.1) {
      // set fluid_level to mid point
      var fluid_level = (high + low) / 2;
      // equivalent area
      var a_eq = fluid_level * channel_width;
      var per = 2 * fluid_level + channel_width;
      var d_eq = 4 * a_eq / per;
      // velocity
      var v = (flow / 3600) / a_eq;
      // friction loss
      var re = density * v * d_eq / viscosity;
      var a = (2.457 * log(((7 / re) ** 0.9 + (0.27 * roughness / d_eq)) ** -1)) ** 16;
      var b = (37530 / re) ** 16;
      var f = 2 * ((8 / re) ** 12 + (a + b) ** -1.5) ** 0.0833;
      var dPdL_fric = (2 * density * f * v ** 2 / d_eq);
      // set low or high to fluid_level
      if (dPdL_fric > dPdL_gravity) {
        low = fluid_level;
      } else {
        high = fluid_level;
      }
      // calculate difference
      diff = abs(dPdL_fric - dPdL_gravity);
      count = count + 1;
      if (fluid_level > channel_height) {
        var value = "full pipe flow";
        diff = 0;
      }
      if (count >= 100) {
        var value = "function did not converge";
        diff = 0;
      }
    }
  }
  if (output == '1') {
    var value = dPdL_fric; // pressure gradient
  } else if (output == '2') {
    var value = v; // velocity (flow / a_eq)
  } else if (output == '3') {
    var percent_filled = a_eq / (channel_height * channel_width); // percent filled
    var value = percent_filled;
  } else if (output == '4') {
    if (fluid_level > channel_height) {
      var value = channel_height; // depth
    } else {
      var value = fluid_level; // depth
    }
  } else {
    var value = 'incorrect output selected';
  }
  return value;
}

function Water(property, temperature) {
  const WaterArray = [
    [0, 999.9, 0.001792],
    [5, 1000, 0.001519],
    [10, 999.7, 0.001308],
    [15, 999.1, 0.00114],
    [20, 998.2, 0.001005],
    [25, 997.1, 0.000894],
    [30, 995.7, 0.000801],
    [35, 994.1, 0.000723],
    [40, 992.2, 0.000656],
    [45, 990.2, 0.000599],
    [50, 988.1, 0.000549],
    [55, 985.7, 0.000506],
    [60, 983.2, 0.000469],
    [65, 980.6, 0.000436],
    [70, 977.8, 0.000406],
    [75, 974.9, 0.00038],
    [80, 971.8, 0.000357],
    [85, 968.6, 0.000336],
    [90, 965.9, 0.000317],
    [95, 961.9, 0.000299],
    [100, 958.4, 0.000284]
  ];
  if (property == 'density') {
    var j = 1;
  } else if (property == 'viscosity') {
    var j = 2;
  } else {
    var j = 0;
  };
  if (temperature > 95) {
    temperature = 95;
  };
  if (temperature < 0) {
    temperature = 0;
  };
  for (var i = 0; i < WaterArray.length; i++) {
    if ((temperature >= WaterArray[i][0]) && (temperature < WaterArray[i + 1][0])) {
      var low = i;
      var high = i + 1;
      break;
    }
  }
  var x1 = WaterArray[low][0];
  var x2 = WaterArray[high][0];
  var y1 = WaterArray[low][j];
  var y2 = WaterArray[high][j];
  var value = (temperature - x1) / (x2 - x1) * (y2 - y1) + y1;
  return value;
}
