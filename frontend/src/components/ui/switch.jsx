import { Switch } from "@headlessui/react";
import { useState } from "react";

export const ThemeSwitch = ({ isDark, setIsDark }) => {
  return (
    <Switch
      checked={isDark}
      onChange={setIsDark}
      className={`${isDark ? "bg-gray-900" : "bg-gray-300"} relative inline-flex h-6 w-11 items-center rounded-full`}
    >
      <span className="sr-only">Tema</span>
      <span
        className={`${isDark ? "translate-x-6 bg-white" : "translate-x-1 bg-gray-800"} inline-block h-4 w-4 transform rounded-full transition`}
      />
    </Switch>
  );
};
