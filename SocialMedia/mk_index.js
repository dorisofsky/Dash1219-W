    $(function() {　
      $(window).load(function() {　　
        $(window).bind('scroll resize', function() {　　
          var $this = $(this);　　
          var $this_Top = $this.scrollTop();　　
          //當高度小於100時，關閉區塊
          　　
          if ($this_Top < 80) {　　　
            $('#top-bar').stop().animate({
              top: "0px"
            });　　　
          }　　　　
          if ($this_Top > 80) {　　　　
            $('#top-bar').stop().animate({
              top: "0px"
            });　　　
          }　　
        }).scroll();　
      });
    });

    $(function() {
      $("#gotop").click(function() {
        jQuery("html,body").animate({
          scrollTop: 0
        }, 1000);
      });
      $(window).scroll(function() {
        if ($(this).scrollTop() > 300) {
          $('#gotop').fadeIn("fast");
        } else {
          $('#gotop').stop().fadeOut("fast");
        }
      });
    });
    $(document).ready(function() {
      draw()
    });

    function draw() {

      var csv = d3.dsv(",", "text/csv;charset=big5");
      csv("https://elsiehsieh.github.io/Dash1121/SocialMedia/typhoondata.csv", function(data) {

        var timeformat = d3.time.format("%Y/%m/%e %H:%M").parse;

        data.forEach(function(d) {
          d.Time = timeformat(d.Time);
          d.geo1 = d.Lat + "," + d.Lon;
          
          var distype = d["disastertype"].split("&");
          var flood = 0;
          var traffic = 0;
          var landslide = 0;
          if (distype.indexOf("淹水") > -1){
            flood = flood + 1;
            
          }
          if (distype.indexOf("交通中斷") > -1){
            traffic = traffic + 1;
            
          }
          if (distype.indexOf("坡地災害") > -1){
            landslide = landslide + 1;
            
          }
          d.Flood1 = flood;
          d.Traffic1 = traffic;
          d.Landslide1 = landslide;
      
        });

        var ndx = crossfilter(data);
        var townId = ndx.dimension(function(d) {
          return d["TOWN_ID"];
        });
        var facilities = ndx.dimension(function(d) {
          return d["geo1"];
        });
        var facilitiesGroup = facilities.group().reduceCount();
        var disastertypes = ndx.dimension(function(d) {
          return d["disastertype"];

        });
        var disastertypesGroup = disastertypes.group().reduceCount();
        var volumebytime = ndx.dimension(function(d) {
          return d3.time.hour(d.Time);
        });
        //var volumebytimeGroup = volumebytime.group().reduceCount(function(d){return d.Time;})
        var value_Flood = volumebytime.group().reduceSum(function(d) {
          return d.Flood1;
        });
        var value_Landslide = volumebytime.group().reduceSum(function(d) {
          return d.Landslide1;
        });
        var value_Traffic = volumebytime.group().reduceSum(function(d) {
          return d.Traffic1;
        });
        var countyDim = ndx.dimension(function(d) {
          return d["C_Name"];
        });
        var county_Disasters = countyDim.group().reduceCount(function(d) {
          return d.Flood1 + d.Landslide1 + d.Traffic1;
        });

        var colorScale = d3.scale.ordinal().domain(["淹水", "坡地災害", "交通中斷", "淹水&坡地災害", "淹水&交通中斷", "交通中斷&坡地災害", "淹水&交通中斷&坡地災害"])
          .range(["#14999e", "#ECA400", "#E85F5C", "#999999", "#999999", "#999999", "#999999"]);

        var MKmarker = dc_leaflet.markerChart("#map")
          .dimension(facilities)
          .group(facilitiesGroup)
          .width(380)
          .height(380)
          .center([23.5, 121])
          .zoom(7)
          .cluster(true)
          .renderPopup(false)
          .filterByArea(true);

        var pie = dc.pieChart("#dis_pie")
          .dimension(disastertypes)
          .group(disastertypesGroup)
          .colors(function(disastertype) {
            return colorScale(disastertype);
          })
          .width(200)
          .height(200)
          .renderLabel(true)
          .renderTitle(true)
          .cap(7)
          .ordering(function(d) {
            return disastertypesGroup;
          });

        var countyRowChart = dc.rowChart("#chart-row-county")
          .width(380)
          .height(220)
          .margins({
            top: 20,
            left: 55,
            right: 0,
            bottom: 20
          })
          .dimension(countyDim)
          .group(county_Disasters, "Disasters")
          .labelOffsetX(-45)
          .colors(d3.scale.category10())
          .elasticX(true)
          .controlsUseVisibility(true)
          .ordering(function(d) {
            return countyDim;
          })
          .rowsCap(5);

        var all = ndx.groupAll();

        var filterCount = dc.dataCount('.filter-count')
          .dimension(ndx)
          .group(all)
          .html({
            some: '%filter-count'
          });

        var totalCount = dc.dataCount('.total-count')
          .dimension(ndx)
          .group(all)
          .html({
            some: '/%total-count'
          });

        var timechart = dc.barChart("#dis_time")
          .width(800)
          .height(220)
          .transitionDuration(500)
          .margins({
            top: 20,
            right: 20,
            bottom: 35,
            left: 35
          })
          .dimension(volumebytime)
          .group(value_Flood, "淹水")
          .stack(value_Landslide, "坡地災害")
          .stack(value_Traffic, "交通中斷")
          .colors(function(disastertype) {
            return colorScale(disastertype);
          })
          .elasticY(true)
          .renderHorizontalGridLines(true)
          // .mouseZoomable(true)
          // .zoomScale([3, new Date("2009/8/12")])
          // .zoomOutRestrict(true)
          .x(d3.time.scale().domain([new Date("2009/8/9"), new Date("2009/8/12")]))
          .xUnits(d3.time.hours)
          .brushOn(true)
          .xAxis().ticks(10);

        var dataTable = dc.dataTable('#dc-table-graph')
          .width(680)
          .dimension(townId)
          .group(function(d) {
            return d.Day;
          })
          .size(Infinity)
          .columns([
            function(d) {
              return d.C_Name;
            },
            function(d) {
              return d.T_Name;
            },
            function(d) {
              return d.Day;
            },
            function(d) {
              return d.Hour2;
            },
            function(d) {
              return d.disastertype;
            },
            function(d) {
              return d.situation;
            },
          ])
          .sortBy(function(d) {
            return d.Time;
          })
          .order(d3.ascending);

        dc.renderAll();
      });
    }