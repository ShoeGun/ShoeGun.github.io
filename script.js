// script.js

// Import necessary components from react-vis
const {
  XYPlot,
  XAxis,
  YAxis,
  LineSeries,
  VerticalBarSeries,
  VerticalGridLines,
  HorizontalGridLines,
  RadialChart,
} = ReactVis;

// LineChart Component
class LineChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: this.generateData(),
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState({ data: this.generateData() });
    }, 5000); // Update every 5 seconds
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  generateData() {
    const data = [];
    for (let i = 0; i < 20; i++) {
      data.push({ x: i, y: Math.random() * 10 });
    }
    return data;
  }

  render() {
    return (
      <XYPlot height={300} width={600} color="#FFCC00">
        <VerticalGridLines />
        <HorizontalGridLines />
        <XAxis title="X Axis" />
        <YAxis title="Y Axis" />
        <LineSeries data={this.state.data} />
      </XYPlot>
    );
  }
}

// BarChart Component
class BarChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: this.generateData(),
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState({ data: this.generateData() });
    }, 7000); // Update every 7 seconds
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  generateData() {
    const data = [];
    for (let i = 1; i <= 10; i++) {
      data.push({ x: `Item ${i}`, y: Math.random() * 10 });
    }
    return data;
  }

  render() {
    return (
      <XYPlot xType="ordinal" height={300} width={600} color="#FFCC00">
        <VerticalGridLines />
        <HorizontalGridLines />
        <XAxis title="Items" />
        <YAxis title="Value" />
        <VerticalBarSeries data={this.state.data} />
      </XYPlot>
    );
  }
}

// Render the charts into their containers
ReactDOM.render(<LineChart />, document.getElementById('chart1'));
ReactDOM.render(<BarChart />, document.getElementById('chart2'));
