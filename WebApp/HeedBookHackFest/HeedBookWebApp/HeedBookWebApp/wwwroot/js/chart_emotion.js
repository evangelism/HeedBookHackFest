var dialogid = document.getElementById("dialogid").value;

$.getJSON('/api/chart/EmotionShareData/' + dialogid, function (datares) {
    var labels = datares.map(function (item) {
        return item.emotionname;
    });
    var dataset = datares.map(function (item) {
        return item.share;
    });

    var ctx = document.getElementById("chart");
    ctx.width = 200;
    ctx.height = 200;

    var data = {
        labels: labels,
        datasets: [
            {
                data: dataset,
                backgroundColor: [
                    '#ffa700',
                    '#008744',
                    '#0057e7',
                    '#d62d20',
                ],
            }
        ]
    };


    var WidgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            animation: {
                animateScale: true
            },
            legend: {
                display: false
            },
            cutoutPercentage: 65,
            responsive: false,
        }
    });

    setInterval(function () {
        $.getJSON('/api/Chart/EmotionShareData/' + dialogid, function (datares) {
            var dataset = datares.map(function (item) {
                return item.share;
            });
            var nextData = {
                datasets: [
                    {
                        data: dataset,
                    }
                ]
            };

            data.datasets[0].data = nextData.datasets[0].data;
            WidgetChart.update();

            $("#positiveshare").text(dataset[1] + "%");

        });

    }, 500);
});