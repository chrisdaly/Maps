const margin = { top: 50, right: 50, bottom: 100, left: 50 };

const width = window.innerWidth - margin.left - margin.right - 10;
const height = window.innerHeight - margin.top - margin.bottom - 20;
const svg = d3
    .select("body")
    .select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const circle_diameter = 90;
let particles;
let i = 0;
const duration = 500;
const opacity_circle_normal = 0.4;

let link_update;
let tree = d3.tree().size([width - 300, height - 300]);
let root_ = d3.hierarchy(data_raw);
root_.x0 = height / 2;
root_.y0 = 0;

// Collapse after the second level
root_.children.forEach(collapse);
update(root_);
tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip"); //('#nytg-tooltip')

function update(source) {
    data = tree(root_);
    data_node = data.descendants();
    data_link = data.descendants().slice(1);

    data_node.forEach(d => {
        d.depth < 2 ? (d.y = d.depth * 220) : (d.y = d.depth * 175);
    });

    d_depth = {
        0: {
            class: "root",
            label: {
                x: 0,
                y: -circle_diameter + 20
            },
            circle: {
                opacity: 0,
                radius: 30
            },
            image: {
                x: -circle_diameter,
                y: -circle_diameter + 40,
                height: circle_diameter * 2
            },
            filter: ""
        },
        1: {
            class: "node",
            label: {
                x: 0,
                y: circle_diameter - 20
            },
            circle: {
                opacity: 0.5,
                radius: 42
            },
            image: {
                x: -circle_diameter / 2,
                y: -circle_diameter / 2,
                height: circle_diameter
            },
            filter: "url(#grayscale)"
        },
        2: {
            class: "leaf",
            label: {
                x: 20,
                y: 1
            },
            circle: {
                opacity: 0.8,
                radius: 5
            },
            image: {
                x: -circle_diameter,
                y: -circle_diameter + 40,
                height: circle_diameter
            },
            filter: ""
        }
    };

    node = svg.selectAll("g.node").data(data_node, d => d.data.id);

    let node_enter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr(
            "transform",
            d => "translate(" + source.x0 + "," + source.y0 + ")"
        )
        .attr("id", d => d.id)
        .style("opacity", 0);

    node_update = node_enter.merge(node).attr("pointer-events", "none");

    node_update
        .on("mouseover",function(d) {
            mouse_over(d)
        })
        .on("mouseout", d => mouse_out(d))
        .on("click", click);

    node_update
        .transition()
        .duration(duration)
        .attr("transform", place_node)
        .style("opacity", 1)
        .on("end", function() {
            d3.select(this).attr("pointer-events", "");
        });

    function find_index_in_parent(d) {
        id = d.data.id;
        array = d.parent.children;
        i = array.findIndex(i => i.data.id === id);
        return i;
    }

    function place_node(d) {
        if (d.depth < 2) {
            x = d.x;
            y = d.y;
        } else {
            x = d.parent.x;
            y = find_leaf_y_position(d);
            console.log(x, y);

            return "translate(" + x + "," + y + ")";
        }
        return "translate(" + x + "," + y + ")";
    }

    function find_leaf_y_position(d) {
        i = find_index_in_parent(d);
        return d.y -30 + (i * 15);
    }

    let labels = node_enter
        .append("text")
        .text(d => d.data.name)
        .attr("class", d => d_depth[d.depth].class)
        .attr("x", d => d_depth[d.depth].label.x)
        .attr("y", d => d_depth[d.depth].label.y);

    let images = node_enter
        .append("svg:image")
        .attr("xlink:href", d => d.data.photo)
        .attr("x", d => d_depth[d.depth].image.x)
        .attr("y", d => d_depth[d.depth].image.y)
        .attr("height", d => d_depth[d.depth].image.height)
        .attr("width", d => d_depth[d.depth].image.height)
        .style("filter", d => d_depth[d.depth].filter);

    let circles = node_enter
        .append("circle")
        .attr("r", d => d_depth[d.depth].circle.radius)
        .attr("fill", d => (d.depth == 0 ? null : "steelblue"))
        .attr("opacity", d => d_depth[d.depth].circle.opacity);

    // circles
    //  .attr(
    //      "r",
    //      d =>
    //          "operator" in d.data
    //              ? node_operator_radius
    //              : node_phrased_radius
    //  )
    //  .attr("fill", d => colour[d.data.operator]);

    let node_exit = node
        .exit()
        .transition()
        .duration(duration)
        .attr("transform", d => "translate(" + source.x + "," + source.y + ")")
        .remove();

    node_exit.select("circle").attr("r", 1e-6);
    node_exit.select("text").style("fill-opacity", 1e-6);

    link = svg.selectAll("path.link").data(data_link, d => d.data.id);

    let link_enter = link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("id", d => d.id)
        .attr("d", d =>
            diagonal({ x: source.x0, y: source.y0 }, { x: source.x0, y: source.y0 })
        );

    // function select_path(d){
    //     if (d.depth < 2) {
    //       path = diagonal(
    //             { x: source.x0, y: source.y0 },
    //             { x: source.x0, y: source.y0 }
    //         )
    //     } else {
    //         path = straight(
    //             { x: source.x0, y: source.y0 },
    //             { x: source.x0, y: source.y0 }
    //         )
    //     }
    //     return path
    // }

    link_update = link_enter.merge(link);

    link_update
        .transition()
        .duration(duration)
        .attr(
            "d",
            d =>
            d.depth < 2 ?
            diagonal(d, d.parent) :
            straight({ x: d.parent.x, y: find_leaf_y_position(d) },
                d.parent
            )
        )
        .attr("stroke-width", 2);

    // function

    let link_exit = link
        .exit()
        .transition()
        .duration(duration)
        .attr("d", d => {
            console.log("source", source);
            diagonal(source.x, source.y);
        })
        .remove();

    // Store the old positions for transition.
    data_node.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function mouse_over(d) {
    root_.children.forEach(collapse);

    transition_node(d, 1.5, circle_diameter / 2, 0, 0, 0.5, "unset");
    if (d.depth == 1) {
        show_tooltip(d);
    }
    node_update.filter(d => d.depth > 1).style('opacity', 0)
    link_update.filter(d => d.depth > 1).style('opacity', 0)
}

function mouse_out(d) {
   
    transition_node(d, 1, 0, 0.3, 1, 0, "url(#grayscale)");
    tooltip
        .transition()
        .duration(duration)
        .style("opacity", 0);
    hide_tooltip();
}

function hide_tooltip() {
    tooltip
        .transition()
        .duration(duration)
        .style("opacity", 0);
}

function transition_node(
    d,
    multiplier,
    offset,
    opacity_circle,
    opacity_label,
    circle_offset,
    filter
) {


    node_this = node_update.filter(
        e => (e.data.id == d.data.id) & (e.depth == 1)
    );

    node_this
        .transition()
        .duration(500)
        .attr(
            "transform",
            d => "translate(" + d.x + "," + (d.y + offset) + ")"
        );

    node_this
        .select("circle")
        .transition()
        .duration(800)
        // .attr("y", d => (circle_diameter * multiplier))
        .attr("r", d => (d.depth < 2 ? circle_diameter * multiplier / 2 : 5))
        .attr(
            "cy",
            d =>
            d.depth == 0 ?
            -circle_diameter * multiplier :
            circle_diameter / 2 * circle_offset
        )
        .attr("opacity", opacity_circle);

    node_this
        .select("text")
        .transition()
        .duration(500)
        .style("opacity", opacity_label);

    node_this
        .select("image")
        .attr(
            "x",
            d =>
            d.depth == 0 ?
            -circle_diameter :
            -(circle_diameter / 2) - offset / 2
        )
        .attr(
            "y",
            d => (d.depth == 0 ? -circle_diameter : -circle_diameter / 2)
        )
        .attr("height", d => circle_diameter * multiplier)
        .attr("width", d => circle_diameter * multiplier)
        .style("filter", filter);
    }

function show_tooltip(d) {
    console.log(d);
    x = d.x + margin.left - 100;
    y = d.y + circle_diameter * 2.5 + 10;

    tooltip
        .style("left", x + "px")
        .style("top", y + "px")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);

    tooltip.html(
        `<div id="tooltip-Container">
            <div class="tooltip-planet">${d.data.name}</div>
            <div class="tooltip-rule"></div>
            <div class="tooltip-year">${d.data.title}</div>
            <div class="tooltip-tail"></div>
          
        </div>`
    );
}

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

// Toggle children on click.
function click(d) {
    hide_tooltip();

    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
}

function diagonal(s, d) {
    path = `M ${s.x} ${s.y}
            L ${s.x} ${s.y - circle_diameter / 2 - 20}
              ${d.x} ${s.y - circle_diameter / 2 - 20},
              ${d.x} ${d.y}`;

    return path;
}

function straight(s, d) {
    path = `M ${s.x} ${s.y}
            L ${d.x} ${d.y}`;

    return path;
}