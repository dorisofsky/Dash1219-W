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
      csv("nfa3.csv", function(data) {

        var timeAllparse = d3.time.format("%Y-%m-%e %H:%M").parse, 
            dateformat = d3.time.format("%Y/%m/%d"), 
            timeformat = d3.time.format("%H:%M");

        data.forEach(function(d) {
            d.parseTime=timeAllparse(d.Time);
            d.date=dateformat(d.parseTime); 
            d.tt=timeformat(d.parseTime);           
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

 //以下順序調動
        var ndx = crossfilter(data);
        var ndxGroupAll = ndx.groupAll();
     
        var geo1Dim = ndx.dimension(function(d) { return d["geo1"]; }); //更改
        var geo1Group = geo1Dim.group().reduceCount(); //更改

        var countyDim  = ndx.dimension(function(d) {return d["C_Name"];});
        var countyDisastersGroup = countyDim.group().reduceCount(function(d){return d.Flood1+d.Landslide1+d.Traffic1;}); //更改
        var townIdDim = ndx.dimension(function(d) { return d["TOWN_ID"]; }); //更改

        var timedim = ndx.dimension(function(d){return d.parseTime;});
        var hourdim = ndx.dimension(function(d) { return d3.time.hour(d.parseTime); });  
        var minTime = timedim.bottom(1)[0].parseTime;
        var maxTime = timedim.top(1)[0].parseTime;

        var disastertypes = ndx.dimension(function(d){return d["disastertype"];});
        var disastertypesGroup = disastertypes.group().reduceCount();
        var FloodGroup = hourdim.group().reduceSum(function(d){return d.Flood1;});
        var LandslideGroup = hourdim.group().reduceSum(function(d){return d.Landslide1;});
        var TrafficGroup = hourdim.group().reduceSum(function(d){return d.Traffic1;});
        var colorScale = d3.scale.ordinal().domain(["淹水", "坡地災害", "交通中斷", "淹水&坡地災害", "淹水&交通中斷", "交通中斷&坡地災害", "淹水&交通中斷&坡地災害"])
          .range(["#14999e", "#ECA400", "#E85F5C", "#999999", "#999999", "#999999", "#999999"]);

 //以上順序調動

        //cluster map - leaflet
        var MKmarker = dc_leaflet.markerChart("#map")
          .dimension(geo1Dim) //更改
          .group(geo1Group) //更改
          .width(380)
          .height(380)
          .center([23.5, 121])
          .zoom(7)
          .cluster(true)
          .renderPopup(false)
          .filterByArea(true);

        //disaster type pie chart
        var pie = dc.pieChart("#dis_pie")
          .dimension(disastertypes)
          .group(disastertypesGroup) //更改
          .colors(function(disastertype) {
            return colorScale(disastertype);
          })
          .width(200)
          .height(200)
          .renderLabel(true)
          .renderTitle(true)
          .cap(7)
          .ordering(function(d) {
            return disastertypesGroup; //更改
          });

        //county row chart
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
          .group(countyDisastersGroup, "Disasters")
          .labelOffsetX(-45)
          .colors(d3.scale.category10())
          .elasticX(true)
          .controlsUseVisibility(true)
          .ordering(function(d) {
            return countyDim;
          })
          .rowsCap(5);

        //filter and total count number
        var filterCount = dc.dataCount('.filter-count')
          .dimension(ndx)
          .group(ndxGroupAll) //更改
          .html({
            some: '%filter-count'
          });

        var totalCount = dc.dataCount('.total-count')
          .dimension(ndx)
          .group(ndxGroupAll) //更改
          .html({
            some: '/%total-count'
          });

        // time bar chart
        var timechart =dc.barChart("#dis_time")
            .width(770)
            .height(250)
            .transitionDuration(500)
            .margins({top: 7, right: 0, bottom: 47, left: 55})
            .dimension(hourdim)
            .group(FloodGroup,"淹水")
            .stack(LandslideGroup,"坡地災害")
            .stack(TrafficGroup,"交通中斷")
            .colors(function(disastertype){ return colorScale(disastertype); })
            .elasticY(true)
            .renderHorizontalGridLines(true)
            .mouseZoomable(false)
            .x(d3.time.scale().domain([minTime, maxTime]))
            .xAxisLabel("Date")
            .centerBar(true)
            .xUnits(function(d){return 70})
            .brushOn(true)
            .xAxis().tickFormat(d3.time.format('%m/%d %H:%M'));

        // data table
        var dataTable = dc.dataTable('#dc-table-graph')
            .width(680)
            .dimension(townIdDim) //更改
            .group(function (d) {return d.date; })
            .size(Infinity)
            .columns([
                function(d){ return d.C_Name;},
                function(d){ return d.T_Name;},
                function(d){ return d.date;}, 
                function(d){ return d.tt;}, 
                function(d){ return d.disastertype;},
                function(d){ return d.situation;},
              ])
            .sortBy(function(d){
                return d.parseTime; 
              })
            .order(d3.ascending);

        dc.renderAll();
      });
    }