/*
 * This file contains the logic of the Timer application. It may seem complex,
 * but it strictly follows the MVC pattern, which dictates to separate model
 * (the Project and Projects classes) from the code manipulating the HTML. The
 * use of MVC was probably not necessary in such a small application, but I
 * consider it an exercise in using this pattern in a new environment
 * (client-side JavaScript application).
 */

/* ===== Project ===== */

/*
 * The Project class represents a project and tracks the time the user has spent
 * working on it.
 *
 * The project can be in two states - stopped and running. The "running" state
 * means that the user is working on the project. The start time of the current
 * work iteration is recorded in the "_currentIterationStartTime" attribute.
 * When the work is finished, the project is switched into the "stopped" state
 * and the difference between the current time and "_currentIterationStartTime"
 * (i.e. the length of the last work iteration) is added to the value of
 * "_timeSpentInPreviousIterations" attribute. This attribute tracks the total
 * amount of time spent on the project (not counting the current work iteration
 * if the project is in the "running" state).
 *
 * The chosen scheme allows to compute the total time spent on the project at
 * any time, touching the attributes only at the times when the work on the
 * project is started or stopped. This property is important when detecting
 * whether other instance of the application touched any projects.
 *
 * All times are stored in classic Unix format: milliseconds since the beginning
 * of time (we all know when it was :-) Time in this format is easy to obtain
 * (by calling "Date.getTime()") and handle (using simple arithmetic).
 */

/* Creates a new Project object. */
function Project(name) {
  this._name = name;
  this._state = Project.State.STOPPED;
  this._timeSpentInPreviousIterations = 0;
  this._currentIterationStartTime = 0;

  this._onChange = null;
}

/* Possible project states. */
Project.State = {
  STOPPED: "stopped",
  RUNNING: "running"
}

Project.prototype = {
  /* Returns the project name. */
  getName:  function() {
    return this._name;
  },

  /* Returns the project state. */
  getState: function() {
    return this._state;
  },

  /* Is the project stopped? */
  isStopped: function() {
    return this._state == Project.State.STOPPED;
  },

  /* Is the project running? */
  isRunning: function() {
    return this._state == Project.State.RUNNING;
  },

  /*
   * Sets the "onChange" event handler. The "onChange" event is fired when the
   * project is started, stopped, or reset.
   */
  setOnChange: function(onChange) {
    this._onChange = onChange;
  },

  /*
   * Returns the time spent on the project in the current work iteration. Works
   * correctly only when the project is running.
   */
  _getCurrentIterationTime: function() {
    return (new Date).getTime() - this._currentIterationStartTime;
  },

  /*
   * Returns the total time spent on the project. This includes time spent in
   * the current work iteration if the project is running.
   */
  getTimeSpent: function() {
    var result = this._timeSpentInPreviousIterations;
    if (this._state == Project.State.RUNNING) {
      result += this._getCurrentIterationTime();
    }
    return result;
  },

  /* Calls the "onChange" event handler if set. */
  _callOnChange: function() {
    if (typeof this._onChange == "function") {
      this._onChange();
    }
  },

  /* Starts a new project work iteration. */
  start: function() {
    if (this._state == Project.State.RUNNING) { return };

    this._state = Project.State.RUNNING;
    this._currentIterationStartTime = (new Date).getTime();
    this._callOnChange();
  },

  /* Stops the current project work iteration. */
  stop: function() {
    if (this._state == Project.State.STOPPED) { return };

    this._state = Project.State.STOPPED;
    this._timeSpentInPreviousIterations += this._getCurrentIterationTime();
    this._currentIterationStartTime = 0;
    this._callOnChange();
  },

  /* Stops the current project work iteration and resets the time data. */
  reset: function() {
    this.stop();
    this._timeSpentInPreviousIterations = 0;
    this._callOnChange();
  },

  /* Serializes the project into a string. */
  serialize: function() {
    /*
     * Originally, I wanted to use "toSource" and "eval" for serialization and
     * deserialization, but "toSource" is not supported by WebKit, so I resorted
     * to ugly hackery...
     */
    return [
      encodeURIComponent(this._name),
      this._state,
      this._timeSpentInPreviousIterations,
      this._currentIterationStartTime
    ].join("&");
  },

  /* Deserializes the project from a string. */
  deserialize: function(serialized) {
    var parts = serialized.split("&");

    this._name                          = decodeURIComponent(parts[0]);
    this._state                         = parts[1];
    this._timeSpentInPreviousIterations = parseInt(parts[2]);
    this._currentIterationStartTime     = parseInt(parts[3]);
  }
}

/* ===== Projects ===== */

/* The Projects class represents a list of projects. */

/* Creates a new Projects object. */
function Projects() {
  this._projects = [];

  this._onAdd = null;
  this._onRemove = null;
}

Projects.prototype = {
  /*
   * Sets the "onAdd" event handler. The "onAdd" event is fired when a project
   * is added to the list.
   */
  setOnAdd: function(onAdd) {
    this._onAdd = onAdd;
  },

  /*
   * Sets the "onRemove" event handler. The "onRemove" event is fired when a
   * project is removed from the list.
   */
  setOnRemove: function(onRemove) {
    this._onRemove = onRemove;
  },

  /* Returns the length of the project list. */
  length: function() {
    return this._projects.length
  },

  /*
   * Returns index-th project in the list, or "undefined" if the index is out of
   * bounds.
   */
  get: function(index) {
    return this._projects[index];
  },

  /*
   * Calls the callback function for each project in the list. The function is
   * called with three parameters - the project, its index and the project list
   * object. This is modeled after "Array.forEach" in JavaScript 1.6.
   */
  forEach: function(callback) {
    for (var i = 0; i < this._projects.length; i++) {
      callback(this._projects[i], i, this);
    }
  },

  /* Calls the "onAdd" event handler if set. */
  _callOnAdd: function(project) {
    if (typeof this._onAdd == "function") {
      this._onAdd(project);
    }
  },

  /* Adds a new project to the end of the list. */
  add: function(project) {
    this._projects.push(project);
    this._callOnAdd(project);
  },

  /* Calls the "onRemove" event handler if set. */
  _callOnRemove: function(index) {
    if (typeof this._onRemove == "function") {
      this._onRemove(index);
    }
  },

  /*
   * Removes index-th project from the list. Does not do anything if the index
   * is out of bounds.
   */
  remove: function(index) {
    this._callOnRemove(index);
    this._projects.splice(index, 1);
  },

  /* Serializes the list of projects into a string. */
  serialize: function() {
    var serializedProjects = [];
    this.forEach(function(project) {
      serializedProjects.push(project.serialize());
    });
    return serializedProjects.join("|");
  },

  /* Deserializes the list of projects from a string. */
  deserialize: function(serialized) {
    /*
     * Repeatedly use "remove" so the "onRemove" event is triggered. Do the same
     * with the "add" method below.
     */
    while (this._projects.length > 0) {
      this.remove(0);
    }

    var serializedProjects = serialized.split("|");
    for (var i = 0; i < serializedProjects.length; i++) {
      var project = new Project("");
      project.deserialize(serializedProjects[i]);
      this.add(project);
    }
  }
}

/* ===== Extensions ===== */

/*
 * Pads this string with another string on the left until the resulting string
 * has specified length. If the padding string has more than one character, the
 * resulting string may be longer than desired (the padding string is not
 * truncated and it is only prepended as a whole). Bad API, I know, but it's
 * good enough for me.
 */
String.prototype.pad = function(length, padding) {
  var result = this;
  while (result.length < length) {
    result = padding + result;
  }
  return result;
}

/* ===== Project List + DOM Storage ===== */

/* The list of projects. */
var projects = new Projects();

/* The last value of the serialized project list string. */
var lastSerializedProjectsString;

/*
 * The key under which the serialized project list string is stored in the DOM
 * Storage.
 */
var PROJECTS_DOM_STORAGE_KEY = "timerProjects";

/*
 * Returns DOM Storage used by the application, or "null" if the browser does
 * not support DOM Storage.
 */
function getStorage() {
  /*
   * HTML 5 says that the persistent storage is available in the
   * "window.localStorage" attribute, however Firefox implements older version
   * of the proposal, which uses "window.globalStorage" indexed by the domain
   * name. We deal with this situation here as gracefully as possible (i.e.
   * without concrete browser detection and with forward compatibility).
   *
   * For more information, see:
   *
   *   http://www.whatwg.org/specs/web-apps/current-work/#storage
   *   https://developer.mozilla.org/En/DOM/Storage
   */
  if (window.localStorage !== undefined) {
    return window.localStorage;
  } else if (window.globalStorage !== undefined) {
    return window.globalStorage[location.hostname];
  } else {
    return null;
  }
}

/*
 * Saves the project list into a DOM Storage. Also updates the value of the
 * "lastSerializedProjectsString" variable.
 */
function saveProjects() {
  var serializedProjectsString = projects.serialize();
  getStorage()[PROJECTS_DOM_STORAGE_KEY] = serializedProjectsString;
  lastSerializedProjectsString = serializedProjectsString;
}

/*
 * Loads the serialized project list string from the DOM Storage. Returns
 * "undefined" if the storage does not contain the string (this happens when
 * running the application for the first time).
 */
function loadSerializedProjectsString() {
  var storedValue = getStorage()[PROJECTS_DOM_STORAGE_KEY];
  /*
   * The spec says "null" should be returned when the key is not found, but some
   * browsers return "undefined" instead. Maybe it was in some earlier version
   * of the spec (I didn't bother to check).
   */
  if (storedValue !== null && storedValue !== undefined) {
    /*
     * The values retrieved from "globalStorage" use one more level of
     * indirection.
     */
    return (window.localStorage === undefined) ? storedValue.value : storedValue;
  } else {
    return undefined;
  }
}

/*
 * Loads the project list from the DOM Storage. Also updates the value of the
 * "lastSerializedProjectsString" variable.
 */
function loadProjects() {
  var serializedProjectsString = loadSerializedProjectsString();
  if (serializedProjectsString !== undefined) {
    projects.deserialize(serializedProjectsString);
    lastSerializedProjectsString = serializedProjectsString;
  }
}

/*
 * Was the project list changed outside of the application? Detects the change
 * by comparing the current serialized project list string in the DOM Storage
 * with a kept old value.
 */
function projectsHaveChangedOutsideApplication() {
  return loadSerializedProjectsString() != lastSerializedProjectsString;
}

/* ===== View ===== */

/* Some time constants. */
var MILISECONDS_IN_SECOND = 1000;
var MILISECONDS_IN_MINUTE = 60 * MILISECONDS_IN_SECOND;
var MINUTES_IN_HOUR       = 60;

/* Formats the time in the H:MM format. */
function formatTime(time) {
  var timeInMinutes = time / MILISECONDS_IN_MINUTE;
  var hours = Math.floor(timeInMinutes / MINUTES_IN_HOUR);
  var minutes = Math.floor(timeInMinutes - hours * MINUTES_IN_HOUR);
  return hours + ":" + String(minutes).pad(2, "0");
}

/*
 * Computes the URL of the image in the start/stop link according to the project
 * state.
 */
function computeStartStopLinkImageUrl(state) {
  switch (state) {
    case Project.State.STOPPED:
      return "img/start.png";
    case Project.State.RUNNING:
      return "img/stop.png";
    default:
      throw "Invalid project state."
  }
}

/*
 * Builds the HTML element of the row in the project table corresponding to the
 * specified project and index.
 */
function buildProjectRow(project, index) {
  var result = $("<tr />");

  var startStopLink = $(
    "<a href='#' class='start-stop-link' title='Start/stop'>"
    + "<img src='" + computeStartStopLinkImageUrl(project.getState()) + "' width='16' height='16' alt='Start/stop' />"
    + "</a>"
  );
  startStopLink.click(function() {
    switch (project.getState()) {
      case Project.State.STOPPED:
        project.start();
        break;
      case Project.State.RUNNING:
        project.stop();
        break;
      default:
        throw "Invalid project state."
    }
    saveProjects();
    return false;
  });

  var resetLink = $(
    "<a href='#' title='Reset'>"
    + "<img src='img/reset.png' width='16' height='16' alt='Reset' />"
    + "</a>"
  );
  resetLink.click(function() {
    project.reset();
    saveProjects();
    return false;
  });

  var deleteLink = $(
    "<a href='#' title='Delete'>"
    + "<img src='img/delete.png' width='16' height='16' alt='Delete' />"
    + "</a>"
  );
  deleteLink.click(function() {
    if (confirm("Do you really want to delete delete project \"" + project.getName() + "\"?")) {
      projects.remove(index);
      saveProjects();
    }
    return false;
  });

  result
    .addClass("state-" + project.getState())
    .append($("<td class='project-name' />").text(project.getName()))
    .append($("<td class='project-time' />").text(formatTime(project.getTimeSpent())))
    .append($("<td class='project-actions' />")
      .append(startStopLink)
      .append(resetLink)
      .append("&nbsp;&nbsp;")
      .append(deleteLink)
    );

  return result;
}

/* Finds row with the specified index in the project table. */
function findRowWithIndex(index) {
  return $("#project-table").find("tr").slice(1).eq(index);
}

/*
 * Updates the row in the project table corresponding to a project according to
 * its state.
 */
function updateProjectRow(row, project) {
  if (project.isStopped()) {
    row.removeClass("state-running");
    row.addClass("state-stopped");
  } else if (project.isRunning()) {
    row.removeClass("state-stopped");
    row.addClass("state-running");
  }

  row.find(".project-time").text(formatTime(project.getTimeSpent()))
  row.find(".start-stop-link img").attr(
    "src",
    computeStartStopLinkImageUrl(project.getState())
  );
}

/* ===== Initialization ===== */

/* Initializes event handlers on the project list. */
function initializeProjectsEventHandlers() {
  projects.setOnAdd(function(project) {
    var row = buildProjectRow(project, projects.length() - 1);
    $("#project-table").append(row);
    project.setOnChange(function() {
      updateProjectRow(row, project);
    });
  });

  projects.setOnRemove(function(index) {
    findRowWithIndex(index).remove();
  });
}

/* Initializes GUI event handlers. */
function initializeGuiEventHandlers() {
  $("#add-project-button").removeAttr("disabled");
  $("#add-project-button").click(function() {
    var projectName = prompt("Enter project name:", "");
    if (projectName === null) { return; }

    var project = new Project(projectName);
    projects.add(project);
    saveProjects();
  });
}

/*
 * Initializes a timer used to update project times and detect changes in the
 * data stored in the DOM Storage.
 */
function initializeTimer() {
  setInterval(function() {
    projects.forEach(function(project, index) {
      updateProjectRow(findRowWithIndex(index), project);
    });

    if (projectsHaveChangedOutsideApplication()) {
      loadProjects();
    }
  }, 10 * MILISECONDS_IN_SECOND);
}

/* Initializes the application. */
$(document).ready(function(){
  try {
    if (!getStorage()) {
      alert("Timer requires a browser with DOM Storage support, such as Firefox 3+ or Safari 4+.");
      return;
    }
  } catch (e) {
    alert("Timer does not work with file: URLs in Firefox.");
    return;
  }

  initializeProjectsEventHandlers();
  loadProjects();
  initializeGuiEventHandlers();
  initializeTimer();
});
