import { useState } from "react";
import gsap from "gsap";

import "./index.css";
import Navibar from "./HomePage/Navibar";
import Header from "./HomePage/Header";
import Categories from "./HomePage/Categories";

const App = () => {
  return (
    <div className="w-full overflow-hidden">
      <Header />
      <Categories />
    </div>
  );
};

export default App;
