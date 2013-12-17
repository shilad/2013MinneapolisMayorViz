var VIZ = VIZ || {};



VIZ.init = function() {
    VIZ.votes = null;
    VIZ.width = 800;
    VIZ.height = 800;
    VIZ.loadData();
};

VIZ.loadData = function() {
    d3.tsv("votes.tsv")
    .row(function (row) { row.votes = +row.votes; return row; })
    .get(function(error, rows) {
        if (error) { VIZ.error(error); }
        VIZ.votes = rows;
        VIZ.initNetwork();
    });

    d3.json("candidates.json")
    .get(function(error, info) {
        if (error) { VIZ.error(error); }
        candidates = d3.map();
        // adds in generated attributes id, x, and y
        for (var i = 0; i < info.length; i++) {
            var c = info[i];
            c.id = "" + i;
            candidates.set(c.key, c);
        }
        VIZ.candidates = candidates;
        VIZ.initNetwork();
    });
};

VIZ.initNetwork = function() {
    if (!VIZ.votes || !VIZ.candidates) {
        return;
    }
    VIZ.model = new VIZ.Model(VIZ.candidates, VIZ.votes);
    var m = VIZ.model;

    var svg = d3.select("#network")
        .append("svg:svg")
        .attr("width", VIZ.width)
        .attr("height", VIZ.width);


    var links = [];
    m.getCandidates().keys().forEach(function (c1) {
        m.getPopularAlternates(c1).forEach(function (c2) {
            links.push({
                source : m.getCandidate(c1),
                target : m.getCandidate(c2)
            });
        });
    });

    var lines = svg.selectAll("line.link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#bbb")
        .attr("stroke-dasharray", "1,3")
        .attr("stroke-width", "1px");

    var cands = svg.selectAll("g.candidate")
        .data(m.getCandidates().values())
        .enter()
        .append("g")
        .attr('class', 'candidate');

    cands.attr("transform",
        function(d) {
            return "translate(" + d.x + ", " + d.y + ")"
        });

    cands.append("image")
        .attr("xlink:href", "https://github.com/favicon.ico")
        .attr("x", -8)
        .attr("y", -8)
        .attr("width", 16)
        .attr("height", 16);

    cands.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function (d) { return d.name; });

//    VIZ.log(links);
    var force = d3.layout.force()
        .nodes(VIZ.candidates.values())
        .links(links)
        .gravity(.1)
        .friction(0.85)
        .linkDistance(100)
        .linkStrength(function (l) {
            var sv = l.source.votes;
            var tv = l.target.votes;
            console.log(Math.sqrt(Math.min(sv, tv) / Math.max(sv, tv)));
            return Math.sqrt(Math.min(sv, tv) / Math.max(sv, tv))
        })
        .charge(-300)
        .size([VIZ.width, VIZ.height]);

    force.on("tick", function (e) {
        cands.attr("transform",
            function(d) {
                return "translate(" + d.x + ", " + d.y + ")"
            });

        lines.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    });
    force.start();
};

VIZ.error = function(msg) {
    alert(msg);
};

VIZ.log = function(msg) {
    if (console && console.log) {
        console.log(msg);
    }
}

$(document).ready(function() {
    VIZ.init();
});