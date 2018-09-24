/**
 * Main entry point to the BioNanoGenomics Plugin.
 *
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dijit/MenuItem',
           'JBrowse/Plugin',
           './View/FileDialog',
           './View/CMapFileDialog',
           'dojox/widget/Toaster'
       ],
       function(
           declare,
           array,
	         lang,
	         dijitMenuItem,
           JBrowsePlugin,
           FileDialog,
           CMapFileDialog
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        var browser = args.browser;

        // do anything you need to initialize your plugin here
        console.log( "BioNanoGenomics plugin starting" );
        var thisB = this;

        //This is the Menu Item shown in the File Menu
        this.browser.afterMilestone('initView',function() {
          this.browser.addGlobalMenuItem('file',new dijitMenuItem(
            {
              label : 'Add BioNanoGenomics Map file',
              iconClass : 'bionanoUploadIcon',
              onClick : lang.hitch(this,'selectBioNanoMap')
            }
            ));
        }, this);
        // this.browser.afterMilestone('initView',function() {
        //   this.browser.addGlobalMenuItem('file',new dijitMenuItem(

        //     {
        //       label : 'Add BioNanoGenomics CMap file',
        //       iconClass : 'bionanoUploadIcon',
        //       onClick : lang.hitch(this,'selectBioNanoCMap')
        //     }
        //     ));
        // }, this);

    },
	selectBioNanoMap : function()
	{
		// console.log("Select Map file");
    /**
     * This opens up the file dialog to load up the different files.
    */
    var filedialog = new FileDialog({browser : this});
    filedialog.show(
      {
            openCallback: dojo.hitch( this, function( results ) {
                var confs = results.trackConfs || [];
                if( confs.length ) {

                    // tuck away each of the store configurations in
                    // our store configuration, and replace them with
                    // their names.
                    array.forEach( confs, function( conf ) {
                        // do it for conf.store
                        var storeConf = conf.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.store;
                            if(!this.browser._storeCache[storeConf.name])
                            {
                              var name = this.browser.addStoreConfig( storeConf.name, storeConf );
                              conf.store = name;
                            }
                            else
                              conf.store = storeConf.name;
                        }

                        // do it for conf.histograms.store, if it exists
                        storeConf = conf.histograms && conf.histograms.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.histograms.store;
                            var name = this.browser.addStoreConfig( storeConf.name, storeConf );
                            conf.histograms.store = name;
                        }
                    },this);

                    // send out a message about how the user wants to create the new tracks
                    this.browser.publish( '/jbrowse/v1/v/tracks/new', confs );

                    // if requested, send out another message that the user wants to show them
                    if( results.trackDisposition == 'openImmediately' )
                        this.browser.publish( '/jbrowse/v1/v/tracks/show', confs );
                }
            })
    });
	},
  selectBioNanoCMap : function()
  {
    console.log("Select Map file");
    var filedialog = new CMapFileDialog({browser : this});
    filedialog.show(
      {
            openCallback: dojo.hitch( this, function( results ) {
                var confs = results.trackConfs || [];
                if( confs.length ) {

                    // tuck away each of the store configurations in
                    // our store configuration, and replace them with
                    // their names.
                    array.forEach( confs, function( conf ) {
                        // do it for conf.store
                        var storeConf = conf.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.store;
                            var name = this.browser.addStoreConfig( storeConf.name, storeConf );
                            conf.store = name;
                        }

                        // do it for conf.histograms.store, if it exists
                        storeConf = conf.histograms && conf.histograms.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.histograms.store;
                            var name = this.browser.addStoreConfig( storeConf.name, storeConf );
                            conf.histograms.store = name;
                        }
                    },this);

                    // send out a message about how the user wants to create the new tracks
                    this.browser.publish( '/jbrowse/v1/v/tracks/new', confs );

                    // if requested, send out another message that the user wants to show them
                    if( results.trackDisposition == 'openImmediately' )
                        this.browser.publish( '/jbrowse/v1/v/tracks/show', confs );
                }
            })
    });
  }
});
});
