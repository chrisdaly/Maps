var width = 960;
var height = 500;

var legend_square_dim = {
    'width': 18,
    'height': 18
}

var rect_spacing = 20;
var legend_offset = {
    'right': 100,
    'bottom': 50
};

var delay = 100;
var duration = 500;

var font_size_highlighted = '20px';
var font_size = '13px';

var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#left").append('svg')
    .attr("width", width)
    .attr("height", height);

d3.queue()
    .defer(d3.json, "us.json")
    .defer(d3.json, "regions_one_california_region.json")
    .await(function(error, us_data, region_data) {
        if (error) throw error;

        var county_data = topojson.feature(us_data, us_data.objects.counties).features;
        var legend_data = get_unique_values(region_data);

        console.log(county_data)
        console.log(region_data)

        counties = svg.selectAll('.county')
            .data(county_data)
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("d", path);

        regions = svg.selectAll('.region')
            .data(region_data)
            .enter()
            .append("path")
            .attr("class", function(d) { return d.zone.toLowerCase(); })
            .attr("id", function(d) { return d.id; })
            .attr("d", function(d) { return path(d.geo); })
            .on('mouseover', function(d) {
                mouseover(d);
                create_table(d);
            })
            .on('mouseout', function(d) {
                mouseout(d);
                delete_table();
            });

        label_divs = d3.select('#left')
            .selectAll('.label_divs')
            .data(region_data)
            .enter()
            .append("div")
            .attr("class", "label_divs")
            .attr("id", function(d) { return d.id; })
            .style('top', function(d) { return calc_div_coords(d)['top'] + "px"; })
            .style('left', function(d) { return calc_div_coords(d)['left'] + "px"; })
            .html(make_html);

        legend = d3.select("svg")
            .selectAll("g")
            .data(legend_data)
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(" + (width - legend_offset['right']) + "," + ((height - legend_offset['bottom']) + (i * rect_spacing)) + ")"; });

        legend.append("rect")
            .attr("width", legend_square_dim['width'])
            .attr("height", legend_square_dim['height'])
            .attr("class", function(d) { return d.toLowerCase(); })

        legend.append("text")
            .data(legend_data)
            .attr("x", legend_square_dim['width'] + 5)
            .attr("y", rect_spacing - 5)
            .text(function(d) { return d; });


    });

// Transitions.
function mouseover(d) {
    highlight_region(d);
    dim_regions(d);
}

function mouseout(d) {
    unhighlight_region(d);
    undim_regions(d);
}

function highlight_region(d) {
    labels_others = get_other_things_in_selection(d, label_divs);
    labels_others
        .transition()
        .style('top', function(d) { return calc_div_coords(d)['top'] + "px" })
        .style('left', function(d) { return calc_div_coords(d)['left'] + "px" })

    // TODO: convert style transitions to CSS, https://stackoverflow.com/questions/30291452/d3-transitions-between-classes
    label_of_this = label_divs.filter(function(a) { return a.id == d.id });

    label_of_this
        .transition()
        .delay(delay)
        .duration(duration)
        .style('left', function(d) { return $('svg').position()['left'] + ((width / 2) - d3.select(this)[0][0]['offsetWidth']) + 'px'; })
        .style('top', function(d) { return $('svg').position()['top'] + 0 + 'px' })
        .style('opacity', 1)
        .style('font-size', font_size_highlighted)
}

function unhighlight_region(d) {
    label_of_this = label_divs.filter(function(a) { return a.id == d.id });

    label_of_this
        .transition()
        .delay(delay)
        .duration(duration)
        .style('top', function(d) { return calc_div_coords(d)['top'] + "px" })
        .style('left', function(d) { return calc_div_coords(d)['left'] + "px" })
        .style('font-size', font_size)
}

function dim_regions(d) {
    regions_others = get_other_things_in_selection(d, regions);

    regions_others
        .transition()
        .attr('class', 'dim')

    labels_others = get_other_things_in_selection(d, label_divs);

    labels_others
        .transition()
        .duration(duration)
        .style('opacity', 0)
        .style('top', function(d) { return calc_div_coords(d)['top'] + "px" })
        .style('left', function(d) { return calc_div_coords(d)['left'] + "px" })
        .style('font-size', font_size)
}

function undim_regions(d) {
    regions
        .transition()
        .delay(delay)
        .duration(duration)
        .attr("class", function(d) { return d.zone.toLowerCase(); })

    labels_others = get_other_things_in_selection(d, label_divs);
    labels_others
        .transition()
        .delay(delay)
        .duration(duration)
        .style('opacity', 1)
}

function get_other_things_in_selection(d, selection) {
    other_things_selection = selection.filter(function(element) {
        return element.id != d.id
    })
    return other_things_selection
}

function delete_table() {
    d3.select("table").remove()
    d3.select("thead").remove()
    d3.select("tbody").remove()
}

function create_table(data) {
    delete_table();

    var table = d3.select("#right").append("table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");

    columns = Object.keys(data.data.lead_candidates[0]);

    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .text(function(column) { return toTitleCase(column); });

    var table = d3.select("table");
    var thead = d3.select("thead");
    var tbody = table.append("tbody");

    var rows = tbody.selectAll("tr")
        .data(data.data.lead_candidates)
        .enter()
        .append("tr");

    var cells = rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column) {
                return { column: column, value: row[column] };
            });
        })
        .enter()
        .append("td")
        .text(function(d) { return d.value; });
}

function calc_div_coords(d) {
    var centroid = path.centroid(d.geo);
    var svg_position = $('svg').position();

    coords = {
        'left': svg_position['left'] + centroid[0] + d.properties.dx,
        'top': svg_position['top'] + centroid[1] + d.properties.dy
    }
    return coords
}

function get_regional_manager(region_data) {
    var regional_manager = null;
    region_data.data.lead_candidates.forEach(function(row) {
        if (row['role'] == 'Regional Sales Leader') {
            regional_manager = row['name']
        }
    })
    return regional_manager;
}

function make_html(region_data) {
    regional_manager = get_regional_manager(region_data);
    return '<p>' + region_data.region_name + "<br/>" + regional_manager + '</p>'
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function get_unique_values(data) {
    var set_of_values = {};

    data.forEach(function(d) {
        var name = (d['zone']);
        set_of_values[name] = 1
    })
    unique_values = Object.keys(set_of_values)

    return unique_values;
}


function shade_colour(colour, percent) {

    var R = parseInt(colour.substring(1,3), 16);
    var G = parseInt(colour.substring(3,5), 16);
    var B = parseInt(colour.substring(5,7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)? R:255;  
    G = (G<255)? G:255;  
    B = (B<255)? B:255;  

    var RR = ((R.toString(16).length==1) ? "0" + R.toString(16): R.toString(16));
    var GG = ((G.toString(16).length==1) ? "0" + G.toString(16): G.toString(16));
    var BB = ((B.toString(16).length==1) ? "0" + B.toString(16): B.toString(16));

    return "#" + RR + GG + BB;
}

